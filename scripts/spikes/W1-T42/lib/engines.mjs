// The two Z3 engines that GATE-specimens and GATE-conformance re-run things on (W1-T42): native Z3 and Pyodide's Z3
// under Node. Dependency-free; Node 22.
//
// Both engines run one Python program (z3py) from standard input and hand back what it printed, so a gate treats
// them alike. Neither is installed by this repository: each is fetched once, checked against the SHA-256 that a
// recorded run names, and kept in a cache directory that git ignores.
//
//   native    the manylinux wheel [X RUN-fixedpoint-equal binary hashes; bench/uv.lock], in a virtual environment that
//             `uv` builds from the checked wheel; or, when the interpreter on PATH already carries the pinned Z3
//             (the Bench image does), that interpreter. STATESPACE_Z3_PYTHON names one explicitly.
//   pyodide   the npm tarball of Pyodide 314.0.7 and the pyemscripten Z3 wheel, loaded the way the tab loads them
//             (loadPackage of the wheel in a Pyodide instance); not through micropip, which the npm package does
//             not carry. node_modules/pyodide is used when it holds the pinned version; STATESPACE_PYODIDE_DIR and
//             STATESPACE_Z3_WASM_WHEEL name another copy.
//
// A program never runs in the directory a gate was started in. The z3py scripts the records quote (`python -I <script>`)
// write beside themselves (the W1-T12 scripts save each query under smt2/), so a gate that ran them where it stands would
// fill the tree it is checking, and go red on a read-only checkout, which is how a nightly container may mount it.
// `run()` takes a `cwd`; without one the native engine makes an empty scratch directory for the run and removes it after
// (withScratchDir). Pyodide's file system is in memory, so what a program writes there never reaches the host.
//
// The pins repeat scripts/spikes/W0-S02/fetch-engines.mjs, scripts/spikes/W0-S03/deps.json and bench/uv.lock;
// test/engines.test.mjs fails when they stop agreeing.

import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** The repository this code lives in (not the tree a gate is pointed at with --root). */
export const REPO = path.resolve(HERE, '..', '..', '..', '..');
export const PYODIDE_HOST = path.join(HERE, 'pyodide-host.mjs');

export const PINS = Object.freeze({
  z3: Object.freeze({ wheelVersion: '5.3.1.0', versionString: '5.3.1' }),
  nativeWheel: Object.freeze({
    file: 'z3_solver-5.3.1.0-py3-none-manylinux_2_27_x86_64.whl',
    url: 'https://files.pythonhosted.org/packages/e9/ed/c327d486ef65228c367ef0f5c306abb3c805538c75db99600f68714ebb46/z3_solver-5.3.1.0-py3-none-manylinux_2_27_x86_64.whl',
    sha256: '3e2e00bc80e776849d917daa194f33759ffa61d6528a859cfc4923ee3277a386',
  }),
  wasmWheel: Object.freeze({
    file: 'z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
    url: 'https://files.pythonhosted.org/packages/7b/05/574cc7c432cbd8dd2f29fce6dbe0dffc3dc34d48ec73723de44dc3905489/z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
    sha256: '62143abf1f1f94e9b1c173db60b2f6b747f4b0780da81f4b05342bdef006bf90',
  }),
  pyodide: Object.freeze({
    version: '314.0.7',
    file: 'pyodide-314.0.7.tgz',
    url: 'https://registry.npmjs.org/pyodide/-/pyodide-314.0.7.tgz',
    sha256: '66b7949e5a0cba2250b586d7e368bf12fb482800748d182c4618254b685ffaa0',
    integrity: 'sha512-0YvXxEhfEdpLfb/XkM2BFAeMROq0iMUX2bzzH9pOttyMcWkwq+HbE5uyuGD82LN7y2q+SNvi/6V5JEsOlD2R1A==',
  }),
  python: '3.13',
});

/** An engine that cannot be set up or run here. A gate exits 2 on it: silence is never a green night. */
export class EngineUnavailable extends Error {
  constructor(message) {
    super(message);
    this.name = 'EngineUnavailable';
  }
}

export const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
export const sha256File = (file) => sha256(fs.readFileSync(file));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------------------ processes
function killTree(child) {
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

/**
 * Run a command to its end or its timeout. Never rejects. Output is kept up to maxBytes per stream.
 * @returns {Promise<{stdout:string, stderr:string, exitCode:number|null, signal:string|null, timedOut:boolean, spawnError:string|null, truncated:boolean, durationMs:number}>}
 */
export function runProcess({ cmd, args = [], input = null, timeoutS = 120, env = process.env, cwd = undefined, maxBytes = 16 * 2 ** 20 }) {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let truncated = false;
    let done = false;
    let child;
    const finish = (extra) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: null, signal: null, timedOut, spawnError: null, truncated, durationMs: Date.now() - started, ...extra });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      if (child) killTree(child);
    }, Math.max(1, timeoutS) * 1000);
    try {
      child = spawn(cmd, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], detached: true });
    } catch (e) {
      finish({ spawnError: e instanceof Error ? e.message : String(e) });
      return;
    }
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (s) => {
      if (stdout.length < maxBytes) stdout += s;
      else truncated = true;
    });
    child.stderr.on('data', (s) => {
      if (stderr.length < maxBytes) stderr += s;
      else truncated = true;
    });
    child.stdin.on('error', () => {
      /* the program ended before it read its input */
    });
    child.on('error', (e) => finish({ spawnError: e.message }));
    child.on('close', (code, signal) => finish({ exitCode: code, signal }));
    child.stdin.end(input ?? '');
  });
}

// ------------------------------------------------------------------ where a program runs
/**
 * Call `fn(dir)` with a scratch directory made for this one call: empty when it starts, removed when it ends, however
 * it ends. A directory that cannot be made is an engine that cannot be set up (the gate exits 2), with the way out named.
 */
export async function withScratchDir(fn) {
  let dir;
  try {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t42-run-'));
  } catch (e) {
    throw new EngineUnavailable(`cannot make a scratch directory for a program to run in (${e?.code ?? 'error'}); set TMPDIR to a directory that can be written`);
  }
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ the cache
export function defaultCacheDir(env = process.env) {
  return path.resolve(env.STATESPACE_ENGINE_CACHE ?? path.join(REPO, '.cache', 'statespace-engines'));
}

async function withLock(lockDir, fn, { timeoutMs = 600000, pollMs = 200 } = {}) {
  fs.mkdirSync(path.dirname(lockDir), { recursive: true });
  const started = Date.now();
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > timeoutMs) fs.rmSync(lockDir, { recursive: true, force: true });
      } catch {
        /* the holder just released it */
      }
      if (Date.now() - started > timeoutMs) throw new EngineUnavailable(`another process holds ${path.basename(lockDir)} for more than ${timeoutMs / 1000} s`);
      await sleep(pollMs);
    }
  }
  try {
    return await fn();
  } finally {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

async function download(url, attempts = 3) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      last = e;
      await sleep(500 * i);
    }
  }
  throw new EngineUnavailable(`cannot download ${url}: ${last instanceof Error ? last.message : last}. Without network the gate needs a cache that already holds the file (STATESPACE_ENGINE_CACHE, ${path.basename(url)})`);
}

/** The path of a pinned file in the cache, downloaded and checked against its SHA-256 first when it is not there. */
export async function ensurePinned(cacheDir, spec) {
  const file = path.join(cacheDir, spec.file);
  const good = () => fs.existsSync(file) && sha256File(file) === spec.sha256;
  if (good()) return file;
  await withLock(path.join(cacheDir, 'locks', `${spec.file}.lock`), async () => {
    if (good()) return;
    fs.rmSync(file, { force: true });
    const bytes = await download(spec.url);
    const got = sha256(bytes);
    if (got !== spec.sha256) throw new EngineUnavailable(`${spec.file} from ${spec.url} has SHA-256 ${got}; the pin is ${spec.sha256}`);
    if (spec.integrity) {
      const integrity = `sha512-${crypto.createHash('sha512').update(bytes).digest('base64')}`;
      if (integrity !== spec.integrity) throw new EngineUnavailable(`${spec.file} has integrity ${integrity}; the registry's is ${spec.integrity}`);
    }
    fs.mkdirSync(cacheDir, { recursive: true });
    const part = `${file}.${process.pid}.part`;
    fs.writeFileSync(part, bytes);
    fs.renameSync(part, file);
  });
  return file;
}

// ------------------------------------------------------------------ the probe, one program for both engines
/** Run first on each engine: names the engine so that a gate can print it, and refuses a pin that has moved. */
export const PROBE_PROGRAM = [
  'import json, sys, z3',
  'print("PROBE " + json.dumps({"z3": z3.get_version_string(), "python": sys.version.split()[0], "platform": sys.platform}, sort_keys=True))',
  '',
].join('\n');

export function parseProbe(stdout) {
  const line = String(stdout).split('\n').find((l) => l.startsWith('PROBE '));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
}

/**
 * The environment a Python child gets: the caller's, with a fixed locale. It is not stripped, because on some systems
 * (Nix, for one) libz3 finds libstdc++ only through LD_LIBRARY_PATH; `python -I` ignores every PYTHON* variable anyway.
 */
function pythonEnv(env) {
  return { ...env, HOME: env.HOME ?? os.tmpdir(), LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
}

// ------------------------------------------------------------------ native Z3
/**
 * @typedef {object} Engine
 * @property {'native'|'pyodide'} id
 * @property {string} describe   one line for the report
 * @property {{z3:string, python:string, platform:string}} probe
 * @property {string|null} wheelSha256   the SHA-256 of the wheel that was installed, when this code installed it
 * @property {(job:{source?:string, file?:string, timeoutS?:number, cwd?:string}) => Promise<ReturnType<typeof runProcess>>} run
 *   `file` is a path from the caller's directory (it is resolved before the program starts); `cwd` is where the program
 *   runs, an empty scratch directory when it is not given.
 */

async function probePython(python, env) {
  const r = await runProcess({ cmd: python, args: ['-I', '-B', '-'], input: PROBE_PROGRAM, timeoutS: 60, env: pythonEnv(env) });
  return { run: r, probe: r.exitCode === 0 ? parseProbe(r.stdout) : null };
}

/** @returns {Promise<Engine>} */
export async function prepareNative({ cacheDir = defaultCacheDir(), env = process.env } = {}) {
  const want = PINS.z3.versionString;
  const wrap = (python, probe, source, wheelSha256) => ({
    id: 'native',
    probe,
    wheelSha256,
    describe: `native z3 ${probe.z3} (CPython ${probe.python}, ${probe.platform}; ${source})`,
    // A file runs as `python -I -B <file>`, which is how the records quote their scripts; a program text comes in on standard input.
    async run({ source: text, file, timeoutS = 120, cwd }) {
      const go = (dir) =>
        text === undefined && file !== undefined
          ? runProcess({ cmd: python, args: ['-I', '-B', path.resolve(file)], timeoutS, env: pythonEnv(env), cwd: dir })
          : runProcess({ cmd: python, args: ['-I', '-B', '-'], input: text, timeoutS, env: pythonEnv(env), cwd: dir });
      return cwd === undefined ? withScratchDir(go) : go(cwd);
    },
  });

  if (env.STATESPACE_Z3_PYTHON) {
    const { run, probe } = await probePython(env.STATESPACE_Z3_PYTHON, env);
    if (!probe) throw new EngineUnavailable(`STATESPACE_Z3_PYTHON (${env.STATESPACE_Z3_PYTHON}) cannot import z3: ${(run.spawnError ?? run.stderr).trim().split('\n').at(-1)}`);
    if (probe.z3 !== want) throw new EngineUnavailable(`STATESPACE_Z3_PYTHON carries z3 ${probe.z3}; the pin is ${want}`);
    return wrap(env.STATESPACE_Z3_PYTHON, probe, 'STATESPACE_Z3_PYTHON', null);
  }
  for (const candidate of ['python3', 'python']) {
    const { probe } = await probePython(candidate, env);
    if (probe && probe.z3 === want) return wrap(candidate, probe, `${candidate} on PATH`, null);
  }

  // Build a virtual environment from the checked wheel.
  const uv = spawnSync('uv', ['--version'], { encoding: 'utf8', env });
  if (uv.status !== 0) throw new EngineUnavailable(`no Python on PATH carries z3 ${want} and uv is not installed; install uv, or set STATESPACE_Z3_PYTHON to an interpreter that does`);
  const wheel = await ensurePinned(cacheDir, PINS.nativeWheel);
  const venv = path.join(cacheDir, `venv-native-${PINS.z3.wheelVersion}-${PINS.nativeWheel.sha256.slice(0, 12)}`);
  const python = path.join(venv, 'bin', 'python');
  const ready = async () => fs.existsSync(python) && (await probePython(python, env)).probe?.z3 === want;
  if (!(await ready())) {
    await withLock(path.join(cacheDir, 'locks', 'venv-native.lock'), async () => {
      if (await ready()) return;
      fs.rmSync(venv, { recursive: true, force: true });
      const make = await runProcess({ cmd: 'uv', args: ['venv', '--python', PINS.python, '--no-project', '--quiet', venv], timeoutS: 300, env });
      if (make.exitCode !== 0) throw new EngineUnavailable(`uv venv --python ${PINS.python} failed: ${(make.spawnError ?? make.stderr).trim().split('\n').at(-1)}`);
      const install = await runProcess({ cmd: 'uv', args: ['pip', 'install', '--quiet', '--python', python, wheel], timeoutS: 300, env });
      if (install.exitCode !== 0) throw new EngineUnavailable(`uv pip install of ${PINS.nativeWheel.file} failed: ${(install.spawnError ?? install.stderr).trim().split('\n').at(-1)}`);
    });
  }
  const { run, probe } = await probePython(python, env);
  if (!probe || probe.z3 !== want) throw new EngineUnavailable(`the virtual environment at ${path.basename(venv)} does not give z3 ${want}: ${(run.spawnError ?? run.stderr).trim().split('\n').at(-1)}`);
  return wrap(python, probe, `wheel ${PINS.nativeWheel.sha256.slice(0, 8)}, cached virtual environment`, PINS.nativeWheel.sha256);
}

// ------------------------------------------------------------------ Pyodide's Z3 under Node
async function pyodideDir({ cacheDir, repo, env }) {
  if (env.STATESPACE_PYODIDE_DIR) {
    const dir = path.resolve(env.STATESPACE_PYODIDE_DIR);
    if (!fs.existsSync(path.join(dir, 'pyodide.mjs'))) throw new EngineUnavailable(`STATESPACE_PYODIDE_DIR (${dir}) holds no pyodide.mjs`);
    return { dir, source: 'STATESPACE_PYODIDE_DIR' };
  }
  const installed = path.join(repo, 'node_modules', 'pyodide');
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf8'));
    if (pkg.version === PINS.pyodide.version && fs.existsSync(path.join(installed, 'pyodide.asm.wasm'))) return { dir: installed, source: 'node_modules/pyodide' };
  } catch {
    /* not installed: use the cached tarball */
  }
  const tgz = await ensurePinned(cacheDir, PINS.pyodide);
  const dir = path.join(cacheDir, `pyodide-${PINS.pyodide.version}`);
  const mark = path.join(dir, '.extracted-from');
  const done = () => fs.existsSync(mark) && fs.readFileSync(mark, 'utf8').trim() === PINS.pyodide.sha256 && fs.existsSync(path.join(dir, 'pyodide.mjs'));
  if (!done()) {
    await withLock(path.join(cacheDir, 'locks', 'pyodide-extract.lock'), async () => {
      if (done()) return;
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const tar = spawnSync('tar', ['-xzf', tgz, '-C', dir, '--strip-components=1', '--no-same-owner'], { encoding: 'utf8' });
      if (tar.status !== 0) throw new EngineUnavailable(`cannot extract ${PINS.pyodide.file}: ${(tar.stderr || tar.error?.message || '').trim()}`);
      fs.writeFileSync(mark, `${PINS.pyodide.sha256}\n`);
    });
  }
  return { dir, source: `${PINS.pyodide.file}, cached` };
}

/** @returns {Promise<Engine>} */
export async function preparePyodide({ cacheDir = defaultCacheDir(), env = process.env, repo = REPO } = {}) {
  const { dir, source } = await pyodideDir({ cacheDir, repo, env });
  let wheel;
  let wheelSha256;
  if (env.STATESPACE_Z3_WASM_WHEEL) {
    wheel = path.resolve(env.STATESPACE_Z3_WASM_WHEEL);
    if (!fs.existsSync(wheel)) throw new EngineUnavailable(`STATESPACE_Z3_WASM_WHEEL (${wheel}) does not exist`);
    wheelSha256 = sha256File(wheel);
    if (wheelSha256 !== PINS.wasmWheel.sha256) throw new EngineUnavailable(`STATESPACE_Z3_WASM_WHEEL has SHA-256 ${wheelSha256}; the pin is ${PINS.wasmWheel.sha256}`);
  } else {
    wheel = await ensurePinned(cacheDir, PINS.wasmWheel);
    wheelSha256 = PINS.wasmWheel.sha256;
  }
  const hostEnv = { ...env, HOME: env.HOME ?? os.tmpdir() };
  // The host is told absolute paths, so that a `cwd` for it can never change what they mean. Python's own file system
  // under Pyodide is in memory: `cwd` here is only where the Node process stands.
  const run = async ({ source: text, file, timeoutS = 120, cwd }) => {
    const input = text ?? fs.readFileSync(file, 'utf8');
    return runProcess({ cmd: process.execPath, args: [PYODIDE_HOST, path.resolve(dir), path.resolve(wheel)], input, timeoutS, env: hostEnv, cwd });
  };
  const first = await run({ source: PROBE_PROGRAM, timeoutS: 180 });
  const probe = first.exitCode === 0 ? parseProbe(first.stdout) : null;
  if (!probe) throw new EngineUnavailable(`Pyodide cannot import z3 from ${path.basename(wheel)}: ${(first.spawnError ?? first.stderr).trim().split('\n').at(-1) || 'no output'}`);
  if (probe.z3 !== PINS.z3.versionString) throw new EngineUnavailable(`Pyodide's wheel carries z3 ${probe.z3}; the pin is ${PINS.z3.versionString}`);
  const pyodideVersion = /pyodide ([0-9][^\s]*)/.exec(first.stderr)?.[1] ?? null;
  if (pyodideVersion !== PINS.pyodide.version) throw new EngineUnavailable(`Pyodide reports version ${pyodideVersion}; the pin is ${PINS.pyodide.version}`);
  return {
    id: 'pyodide',
    probe,
    wheelSha256,
    pyodideVersion,
    describe: `pyodide ${pyodideVersion} with z3 ${probe.z3} (CPython ${probe.python}, ${probe.platform}; wheel ${wheelSha256.slice(0, 8)}; ${source})`,
    run,
  };
}

// ------------------------------------------------------------------ both, lazily
/**
 * The engines a gate asks for, each set up on first use and kept. `fakes` replaces an engine (tests, self-checks).
 * @returns {{native: () => Promise<Engine>, pyodide: () => Promise<Engine>, cacheDir: string}}
 */
export function createEngines({ cacheDir = defaultCacheDir(), env = process.env, repo = REPO, fakes = {} } = {}) {
  const memo = new Map();
  /** A cache that cannot be written is an engine that cannot be set up, with the way out named. */
  const guarded = async (make) => {
    try {
      return await make();
    } catch (e) {
      if (!(e instanceof EngineUnavailable) && ['EACCES', 'EPERM', 'EROFS', 'ENOSPC', 'ENOTDIR'].includes(e?.code)) {
        throw new EngineUnavailable(`cannot write the engine cache ${path.basename(cacheDir)} (${e.code}); set STATESPACE_ENGINE_CACHE to a directory that can be written`);
      }
      throw e;
    }
  };
  const once = (id, make) => () => {
    if (fakes[id]) return Promise.resolve(fakes[id]);
    if (!memo.has(id)) memo.set(id, guarded(make));
    return memo.get(id);
  };
  return {
    cacheDir,
    native: once('native', () => prepareNative({ cacheDir, env })),
    pyodide: once('pyodide', () => preparePyodide({ cacheDir, env, repo })),
  };
}
