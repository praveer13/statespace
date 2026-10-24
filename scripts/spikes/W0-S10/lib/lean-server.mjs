// Minimal Lean language-server client for build-time goal extraction (W0-S10 spike).
// Dependency-free Node. The Docker-specific code is confined to this file (`sandboxArgs`,
// `probeToolchain`, `LeanServer.start` and `kill`); a native runner would start `lean --server`
// directly. It is not written here because it was not run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

// A 114-byte TZif file for UTC. Without /etc/localtime the 4.35.0 server answers `initialize`, then
// exits with status 1 and "no such file or directory ... /etc/localtime" (RUN-replay-gen, config
// server-without-localtime), and the pinned image ships none. Mounting this file keeps the run
// hermetic: no host timezone reaches the container.
export const UTC_TZIF = Buffer.from(
  '545a69663200000000000000000000000000000000000000000000000000000000000000000000010000000400000000000055544300' +
    '545a696632000000000000000000000000000000000000000000000000000000000000000000000100000004000000000000555443000a555443300a',
  'hex',
);

let counter = 0;

/**
 * Arguments shared by every container the generator starts: no network, a memory cap, the corpus
 * mounted read-only at /w, a UTC /etc/localtime, and any extra read-only mounts (a second toolchain).
 */
export function sandboxArgs({ corpusDir, tzFile, mounts = [], memory = '6g', cpusetCpus = null }) {
  return [
    '--rm',
    '--network', 'none',
    `--memory=${memory}`,
    ...(cpusetCpus === null ? [] : [`--cpuset-cpus=${cpusetCpus}`]),
    '-v', `${corpusDir}:/w:ro`,
    '-v', `${tzFile}:/etc/localtime:ro`,
    ...mounts.flatMap((m) => ['-v', `${m}:ro`]),
    '-w', '/w',
  ];
}

/** `lean --version` and the SHA-256 of the toolchain's own `bin/lean`, read inside the container. */
export async function probeToolchain({ image, leanBin = 'lean', ...sandbox }) {
  const script = `P=$(${leanBin} --print-prefix) && ${leanBin} --version && sha256sum "$P/bin/lean"`;
  const { stdout } = await execFileP('docker', ['run', ...sandboxArgs(sandbox), image, 'sh', '-c', script], { timeout: 120_000 });
  const lines = stdout.trim().split('\n');
  if (lines.length !== 2 || !/^[0-9a-f]{64} /.test(lines[1])) throw new Error(`unexpected toolchain probe output: ${JSON.stringify(stdout)}`);
  return { banner: lines[0], binarySha256: lines[1].slice(0, 64) };
}

export class LeanServer {
  constructor({ image, leanBin = 'lean', leanOptions = [], requestTimeoutMs = 120_000, ...sandbox }) {
    this.image = image;
    this.leanBin = leanBin;
    this.leanOptions = leanOptions;
    this.sandbox = sandbox;
    this.requestTimeoutMs = requestTimeoutMs;
    this.name = `ss-s10-${process.pid}-${++counter}`;
    this.buf = Buffer.alloc(0);
    this.pending = new Map();
    this.nextId = 0;
    this.diagnostics = new Map();
    this.stderr = '';
    this.exited = false;
  }

  /** The `docker` argument vector, with the container name as given (callers normalise paths for logs). */
  argv() {
    return [
      'run', '-i', '--name', this.name,
      ...sandboxArgs(this.sandbox),
      this.image, this.leanBin, '--server', ...this.leanOptions.map((o) => `-D${o}`),
    ];
  }

  async start() {
    this.proc = spawn('docker', this.argv(), { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.on('data', (d) => this.#onData(d));
    this.proc.stderr.on('data', (d) => { if (this.stderr.length < 65536) this.stderr += d.toString('utf8'); });
    this.proc.stdin.on('error', () => {});
    this.proc.on('error', (error) => this.#rejectAll(error));
    this.exitPromise = new Promise((resolve) => {
      this.proc.on('exit', (code, signal) => {
        this.exited = true;
        this.#rejectAll(new Error(`lean --server exited early (code ${code}, signal ${signal}). stderr: ${this.stderr.trim()}`));
        resolve({ code, signal });
      });
    });
    const init = await this.request('initialize', { processId: null, rootUri: 'file:///w', capabilities: {} });
    this.notify('initialized', {});
    return init.result;
  }

  /** Open a file and wait until Lean has published every diagnostic for it. */
  async open(file, text) {
    const uri = `file:///w/${file}`;
    this.diagnostics.delete(uri);
    this.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'lean4', version: 1, text } });
    await this.request('textDocument/waitForDiagnostics', { uri, version: 1 });
    return this.diagnostics.get(uri) ?? [];
  }

  /** The goals Lean reports at a position (0-based line and UTF-16 character), or null when it has none. */
  async plainGoal(file, line, character) {
    const r = await this.request('$/lean/plainGoal', {
      textDocument: { uri: `file:///w/${file}` },
      position: { line, character },
    });
    return r.result === null || r.result === undefined ? null : r.result.goals;
  }

  async stop() {
    if (!this.exited) {
      try {
        await this.request('shutdown', undefined, 15_000);
        this.notify('exit', undefined);
      } catch { /* fall through to the forced stop */ }
      const timer = setTimeout(() => this.kill(), 15_000);
      await this.exitPromise;
      clearTimeout(timer);
    }
    this.kill();
  }

  /** Remove the container whatever state it is in. Synchronous so signal handlers can use it. */
  kill() {
    spawnSync('docker', ['rm', '-f', this.name], { stdio: 'ignore' });
  }

  notify(method, params) {
    this.#write({ jsonrpc: '2.0', method, params });
  }

  request(method, params, timeoutMs = this.requestTimeoutMs) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout after ${timeoutMs} ms waiting for ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.#write({ jsonrpc: '2.0', id, method, params });
    });
  }

  #write(message) {
    const body = JSON.stringify(message);
    this.proc.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }

  #rejectAll(error) {
    for (const [id, p] of this.pending) { clearTimeout(p.timer); p.reject(error); this.pending.delete(id); }
  }

  #onData(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    try {
      for (;;) {
        const headerEnd = this.buf.indexOf('\r\n\r\n');
        if (headerEnd < 0) return;
        const m = /Content-Length:\s*(\d+)/i.exec(this.buf.subarray(0, headerEnd).toString('ascii'));
        if (!m) throw new Error('language-server frame without Content-Length');
        const end = headerEnd + 4 + Number(m[1]);
        if (this.buf.length < end) return;
        const message = JSON.parse(this.buf.subarray(headerEnd + 4, end).toString('utf8'));
        this.buf = this.buf.subarray(end);
        this.#dispatch(message);
      }
    } catch (error) {
      this.#rejectAll(error);
    }
  }

  #dispatch(msg) {
    if (msg.method === undefined) {
      // A response. Server requests and notifications also carry ids or methods, so this test
      // keeps a server request's id from being mistaken for the answer to one of ours.
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error) p.reject(new Error(`${p.method} failed: ${JSON.stringify(msg.error)}`));
      else p.resolve(msg);
    } else if (msg.id !== undefined) {
      // A request from the server (client/registerCapability, workspace/inlayHint/refresh): acknowledge.
      this.#write({ jsonrpc: '2.0', id: msg.id, result: null });
    } else if (msg.method === 'textDocument/publishDiagnostics') {
      // Each notification carries the full list for the file so far, so the last one wins.
      this.diagnostics.set(msg.params.uri, msg.params.diagnostics);
    }
  }
}

/** Log form of a docker argument vector: host paths replaced by placeholders. */
function normalise(argv, o, tzFile, name) {
  const hosts = o.mounts.map((m) => m.split(':')[0]);
  return ['docker', ...argv].map((a) => {
    let r = a.replace(o.corpus, '<corpus>').replace(tzFile, '<utc-localtime>').replace(name, '<container>');
    for (const h of hosts) r = r.replace(h, '<mount-host>');
    return r;
  });
}

/**
 * Run `fn(server, info)` against a started server and always clean up: the container is removed
 * and the temporary UTC localtime file deleted, on success, on failure and on a signal.
 * `o`: { image, leanBin, leanOptions, corpus, mounts, cpusetCpus, timeoutS }.
 */
export async function withLeanServer(o, fn) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-s10-'));
  const tzFile = path.join(work, 'localtime');
  fs.writeFileSync(tzFile, UTC_TZIF);
  const sandbox = { corpusDir: o.corpus, tzFile, mounts: o.mounts, cpusetCpus: o.cpusetCpus };
  const server = new LeanServer({ image: o.image, leanBin: o.leanBin, leanOptions: o.leanOptions, ...sandbox });
  const onSignal = () => { server.kill(); process.exit(130); };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  const deadline = setTimeout(() => { console.error(`timeout after ${o.timeoutS} s`); server.kill(); process.exit(1); }, o.timeoutS * 1000);
  try {
    const toolchain = await probeToolchain({ image: o.image, leanBin: o.leanBin, ...sandbox });
    const argv = normalise(server.argv(), o, tzFile, server.name).join(' ');
    await server.start();
    return await fn(server, { toolchain, argv });
  } finally {
    clearTimeout(deadline);
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    await server.stop();
    fs.rmSync(work, { recursive: true, force: true });
    if (server.stderr.trim() !== '') console.error(`server stderr: ${server.stderr.trim()}`);
  }
}
