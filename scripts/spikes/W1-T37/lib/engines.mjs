// The two Z3 engines of GATE-calls and its conformance pair (W1-T37), each a long-lived line server running
// lib/harness.py: native CPython with the z3-solver 5.3.1.0 wheel, and Pyodide 314.0.7 with the pyemscripten wheel
// under Node (the engine the tab runs). One request goes in as a line of JSON and one reply comes back, so a batch of
// cells costs one engine start, and the engine port can answer thousands of small requests.
//
// The pins and the engine cache are W1-T42's (scripts/spikes/W1-T42/lib/engines.mjs: PINS, ensurePinned and the
// cache under .cache/statespace-engines), so every gate fetches and checks the same files once. Where each engine comes
// from, first match wins, the same order as W1-T42's:
//   native    STATESPACE_Z3_PYTHON; python3 or python on PATH if it carries z3 5.3.1; the cached virtual environment
//             that W1-T42's prepareNative() builds from the checked wheel
//   pyodide   STATESPACE_PYODIDE_DIR; node_modules/pyodide at the pinned version; the cached tarball, extracted by
//             W1-T42's preparePyodide(); the wheel from STATESPACE_Z3_WASM_WHEEL (checked) or the cache (checked)
// Each server's first line names its versions; another Z3 or Pyodide than the pin is an engine that cannot be set up.
//
// Every request has a wall-clock watchdog. A request that outlives it is answered {terminated: true}, the server is
// killed, and the next request starts a fresh one; so one cell that never returns costs its own result only. A server
// holds no reference on Node's event loop while it is idle, so a process that borrowed a port (GATE-generators) exits
// when its own work is done.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { EngineUnavailable, PINS, REPO, defaultCacheDir, ensurePinned, prepareNative, preparePyodide, sha256File } from '../../W1-T42/lib/engines.mjs';

export { EngineUnavailable, PINS, REPO, defaultCacheDir };

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const HARNESS = path.join(HERE, 'harness.py');
export const PYODIDE_SERVER = path.join(HERE, 'pyodide-server.mjs');

/**
 * The rlimit every check of an authored cell runs under unless the cell sets its own [D]: the figure every solver call of
 * the S1 runs used (RLIMIT in runs/inputs/S1/; for example [X RUN-z3-boot-variant]).
 */
export const DEFAULT_RLIMIT = 5000000;
/** The watchdog of one cell or request, wall clock [D]. */
export const DEFAULT_WALL_MS = 30000;
const READY_TIMEOUT_MS = 180000;

// ------------------------------------------------------------------ a line server
export class LineServer {
  /**
   * @param {{id: string, cmd: string, args: string[], env?: object, cwd?: string, accept: (ready: object) => string|null}} spec
   *   `accept` reads the ready line and returns null, or why the engine is not the pinned one.
   */
  constructor(spec) {
    this.spec = spec;
    this.child = null;
    this.ready = null;
    this.starting = null;
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.seq = 0;
    this.stderr = '';
    this.starts = 0;
    this.kills = 0;
    this.closed = false;
  }

  /** Start the server, or return the one already running: resolves with its ready line. */
  start() {
    if (this.ready && this.child) return Promise.resolve(this.ready);
    if (this.starting) return this.starting;
    this.starting = new Promise((resolve, reject) => {
      const { cmd, args, env = process.env, cwd } = this.spec;
      let child;
      try {
        child = spawn(cmd, args, { cwd: cwd ?? os.tmpdir(), env, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (e) {
        reject(new EngineUnavailable(`${this.spec.id}: cannot start ${path.basename(cmd)}: ${e instanceof Error ? e.message : e}`));
        return;
      }
      this.starts += 1;
      this.child = child;
      this.stderr = '';
      let gotReady = false;
      const timer = setTimeout(() => {
        if (!gotReady) {
          this.kill();
          reject(new EngineUnavailable(`${this.spec.id}: the engine did not start within ${READY_TIMEOUT_MS / 1000} s`));
        }
      }, READY_TIMEOUT_MS);
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (s) => {
        this.stderr = (this.stderr + s).slice(-4000);
      });
      child.stdin.on('error', () => {
        /* the server ended; the exit handler answers what is pending */
      });
      child.on('error', (e) => {
        clearTimeout(timer);
        if (!gotReady) reject(new EngineUnavailable(`${this.spec.id}: cannot start ${path.basename(cmd)}: ${e.message}`));
      });
      child.on('exit', (code, signal) => {
        clearTimeout(timer);
        if (this.child === child) {
          this.child = null;
          this.ready = null;
          this.starting = null;
        }
        if (!gotReady) {
          reject(new EngineUnavailable(`${this.spec.id}: the engine exited before it was ready (${code ?? signal}): ${this.stderrTail()}`));
          return;
        }
        for (const [, p] of this.pending) p.finish({ crashed: true, detail: `the engine exited (${code ?? signal}): ${this.stderrTail()}` });
        this.pending.clear();
      });
      const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
      lines.on('line', (line) => {
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          this.stderr = (this.stderr + `\n[unreadable protocol line] ${line.slice(0, 200)}`).slice(-4000);
          return;
        }
        if (!gotReady) {
          gotReady = true;
          clearTimeout(timer);
          const why = msg && msg.ready ? this.spec.accept(msg) : `the first line was not a ready line`;
          if (why) {
            this.kill();
            reject(new EngineUnavailable(`${this.spec.id}: ${why}`));
            return;
          }
          this.ready = msg;
          this.idle();
          resolve(msg);
          return;
        }
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          p.finish(msg);
        }
      });
    });
    return this.starting.finally(() => {
      this.starting = null;
    });
  }

  stderrTail() {
    return this.stderr.trim().split('\n').slice(-3).join(' | ') || 'no message';
  }

  /** While idle the server holds no reference on the event loop. */
  idle() {
    if (!this.child || this.pending.size > 0) return;
    for (const s of [this.child, this.child.stdin, this.child.stdout, this.child.stderr]) s?.unref?.();
  }

  busy() {
    if (!this.child) return;
    for (const s of [this.child, this.child.stdin, this.child.stdout, this.child.stderr]) s?.ref?.();
  }

  kill() {
    const child = this.child;
    if (!child) return;
    this.child = null;
    this.ready = null;
    this.kills += 1;
    try {
      child.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }

  /**
   * Send one request and wait for its reply. Requests are answered one at a time, in the order sent. Resolves with the
   * reply, `{terminated: true}` when the watchdog fired, or `{crashed: true, detail}` when the server died; rejects only
   * with EngineUnavailable, when the server cannot be (re)started.
   */
  call(request, { wallMs = DEFAULT_WALL_MS } = {}) {
    const run = async () => {
      if (this.closed) throw new EngineUnavailable(`${this.spec.id}: the engine was closed`);
      await this.start();
      const child = this.child;
      if (!child) return { crashed: true, detail: `the engine exited: ${this.stderrTail()}` };
      const id = `q${++this.seq}`;
      const started = Date.now();
      return await new Promise((resolve) => {
        let done = false;
        const finish = (msg) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          this.idle();
          resolve({ ...msg, wallMs: Date.now() - started });
        };
        const timer = setTimeout(() => {
          this.pending.delete(id);
          this.kill();
          finish({ terminated: true, detail: `no reply within ${+(wallMs / 1000).toFixed(1)} s; the engine was stopped and the next request starts a fresh one` });
        }, wallMs);
        this.pending.set(id, { finish });
        this.busy();
        child.stdin.write(`${JSON.stringify({ ...request, id })}\n`);
      });
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => {});
    return next;
  }

  close() {
    this.closed = true;
    this.kill();
  }
}

const killOnExit = new Set();
process.on('exit', () => {
  for (const s of killOnExit) s.kill();
});

// ------------------------------------------------------------------ where the engines come from
async function firstReady(candidates) {
  const why = [];
  for (const c of candidates) {
    const server = new LineServer(c);
    try {
      await server.start();
      return { server, source: c.source };
    } catch (e) {
      server.close();
      if (!(e instanceof EngineUnavailable)) throw e;
      why.push(`${c.source}: ${e.message}`);
      if (c.final) throw new EngineUnavailable(why.join('; '));
    }
  }
  throw new EngineUnavailable(why.join('; ') || 'no candidate');
}

const acceptNative = (ready) => (ready.probe?.z3 === PINS.z3.versionString ? null : `it carries z3 ${ready.probe?.z3 ?? 'none'}; the pin is ${PINS.z3.versionString}`);

function pythonEnv(env) {
  return { ...env, HOME: env.HOME ?? os.tmpdir(), LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
}

/** The native engine: a harness server on a CPython that carries the pinned z3-solver. */
export async function startNative({ cacheDir = defaultCacheDir(), env = process.env } = {}) {
  const spec = (python, source, final = false) => ({ id: 'native', source, final, cmd: python, args: ['-I', '-B', HARNESS, '--serve'], env: pythonEnv(env), accept: acceptNative });
  if (env.STATESPACE_Z3_PYTHON) return finishNative(await firstReady([spec(env.STATESPACE_Z3_PYTHON, 'STATESPACE_Z3_PYTHON', true)]));
  const venvPython = path.join(cacheDir, `venv-native-${PINS.z3.wheelVersion}-${PINS.nativeWheel.sha256.slice(0, 12)}`, 'bin', 'python');
  const cached = `wheel ${PINS.nativeWheel.sha256.slice(0, 8)}, ${CACHED_VENV}`;
  const candidates = [spec('python3', 'python3 on PATH'), spec('python', 'python on PATH')];
  if (fs.existsSync(venvPython)) candidates.push(spec(venvPython, cached));
  try {
    return finishNative(await firstReady(candidates));
  } catch (e) {
    if (!(e instanceof EngineUnavailable)) throw e;
  }
  // None is ready: let W1-T42's setup build the virtual environment from the checked wheel, then use it.
  await prepareNative({ cacheDir, env });
  return finishNative(await firstReady([spec(venvPython, cached, true)]));
}

const CACHED_VENV = 'cached virtual environment';

function finishNative({ server, source }) {
  killOnExit.add(server);
  const p = server.ready.probe;
  // The wheel's SHA-256 is known only when the virtual environment was built here from the checked wheel.
  const wheelSha256 = source.endsWith(CACHED_VENV) ? PINS.nativeWheel.sha256 : null;
  return { id: 'native', server, probe: p, wheelSha256, describe: `native z3 ${p.z3} (CPython ${p.python}, ${p.platform}; ${source})` };
}

async function pyodideLocation({ cacheDir, env, repo }) {
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
    /* not installed: the cached tarball */
  }
  const dir = path.join(cacheDir, `pyodide-${PINS.pyodide.version}`);
  const extracted = () => {
    try {
      return fs.readFileSync(path.join(dir, '.extracted-from'), 'utf8').trim() === PINS.pyodide.sha256 && fs.existsSync(path.join(dir, 'pyodide.mjs'));
    } catch {
      return false;
    }
  };
  if (!extracted()) await preparePyodide({ cacheDir, env, repo });
  if (!extracted()) throw new EngineUnavailable(`the Pyodide tarball was not extracted to ${path.basename(dir)}`);
  return { dir, source: `${PINS.pyodide.file}, cached` };
}

/** Pyodide's engine: a harness server on Pyodide under Node, the tab's engine. */
export async function startPyodide({ cacheDir = defaultCacheDir(), env = process.env, repo = REPO } = {}) {
  const { dir, source } = await pyodideLocation({ cacheDir, env, repo });
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
  const accept = (ready) => {
    const p = ready.probe ?? {};
    if (p.z3 !== PINS.z3.versionString) return `Pyodide's wheel carries z3 ${p.z3 ?? 'none'}; the pin is ${PINS.z3.versionString}`;
    if (p.pyodide !== PINS.pyodide.version) return `Pyodide reports version ${p.pyodide ?? 'none'}; the pin is ${PINS.pyodide.version}`;
    return null;
  };
  const { server } = await firstReady([
    { id: 'pyodide', source, final: true, cmd: process.execPath, args: [PYODIDE_SERVER, path.resolve(dir), path.resolve(wheel), HARNESS], env: { ...env, HOME: env.HOME ?? os.tmpdir() }, accept },
  ]);
  killOnExit.add(server);
  const p = server.ready.probe;
  return { id: 'pyodide', server, probe: p, wheelSha256, describe: `pyodide ${p.pyodide} with z3 ${p.z3} (CPython ${p.python}, ${p.platform}; wheel ${wheelSha256.slice(0, 8)}; ${source})` };
}

/** Both engines, each started on first use and kept: {native(), pyodide(), close()}. */
export function createZ3Engines({ cacheDir = defaultCacheDir(), env = process.env, repo = REPO } = {}) {
  const memo = new Map();
  const once = (id, make) => () => {
    if (!memo.has(id)) memo.set(id, make());
    return memo.get(id);
  };
  const engines = {
    cacheDir,
    native: once('native', () => startNative({ cacheDir, env })),
    pyodide: once('pyodide', () => startPyodide({ cacheDir, env, repo })),
    async close() {
      for (const p of memo.values()) {
        try {
          (await p).server.close();
        } catch {
          /* it never started */
        }
      }
    },
  };
  return engines;
}
