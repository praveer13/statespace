// The second solver of GATE-calls (W1-T37; spine section 11.2, V2-12): the Bench's cvc5 binary, the static Linux
// x86_64 build of cvc5 1.4.2 whose release asset and binary RUN-scaffold pins by SHA-256. The pin is read from that
// record (configuration bench-cvc5-version), so a re-recorded Bench moves the gate with it; nothing here repeats it.
//
// Where the binary comes from, first match wins:
//   STATESPACE_CVC5     a path to a cvc5 binary; its SHA-256 must equal the pin
//   cvc5 on PATH        used when its SHA-256 equals the pin (an unpinned cvc5 on PATH is passed over, and the report says so)
//   the engine cache    the release asset, downloaded once from the URL the record names, checked against the asset's
//                       SHA-256, and the binary taken out of it and checked against the binary's (Linux x86_64 only)
// Anything else is an engine that cannot be set up: the gate exits 2, never 0.
//
// A query runs as `cvc5 --lang smt2 --incremental --produce-models --tlimit=<ms> query.smt2`, in a scratch folder of its
// own. Each query the gate sends ends in one check (lib/harness.py cuts one per check of an SMT-LIB cell), and
// --incremental is there for the push and pop such a query may hold, which cvc5 refuses without it ("cannot push when
// not solving incrementally"). The verdicts are the lines that read sat, unsat or unknown, in order, and every
// "(error" line is kept: the judge counts a single verdict with no error line and nothing else, because cvc5 1.4.2 stops
// at a parse error (an undeclared symbol, an unknown command), where Z3 goes on, and goes on past a command that fails
// (a get-model after unsat), so an answer with an error line is not an answer to the query Z3 checked
// (cvc5.test.mjs runs the pinned binary on both kinds). The file is named relative to its folder, so a message that
// quotes it names no machine path.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { EngineUnavailable, REPO, defaultCacheDir, ensurePinned, runProcess, sha256File } from '../../W1-T42/lib/engines.mjs';

export const PIN_RUN = 'RUN-scaffold';
export const PIN_CONFIG = 'bench-cvc5-version';
const ENTRY = 'cvc5-Linux-x86_64-static/bin/cvc5';

/** The pin as RUN-scaffold records it: the version line, the binary's SHA-256 and the release asset. */
export function readPin(repo = REPO) {
  const file = path.join(repo, 'runs', `${PIN_RUN}.json`);
  let record;
  try {
    record = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new EngineUnavailable(`cannot read the cvc5 pin from runs/${PIN_RUN}.json: ${e instanceof Error ? e.message : e}`);
  }
  const config = (record.configs ?? []).find((c) => c.id === PIN_CONFIG);
  const asset = config?.inputs?.find((i) => typeof i.url === 'string' && i.url.endsWith('.zip'));
  if (!config || !/^[0-9a-f]{64}$/.test(config.binary_sha256 ?? '') || !asset || !/^[0-9a-f]{64}$/.test(asset.sha256 ?? '') || typeof config.version !== 'string') {
    throw new EngineUnavailable(`runs/${PIN_RUN}.json has no usable ${PIN_CONFIG} configuration (version, binary_sha256 and the release asset's url and sha256)`);
  }
  return {
    run: PIN_RUN,
    versionLine: config.version,
    binarySha256: config.binary_sha256,
    asset: { file: path.basename(new URL(asset.url).pathname), url: asset.url, sha256: asset.sha256, bytes: asset.bytes ?? null },
  };
}

// ------------------------------------------------------------------ the release asset
/** One file out of a zip archive (stored or deflated, no zip64), by its name. */
export function extractZipEntry(zip, name) {
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 65535); i--) {
    if (zip.readUInt32LE(i) === eocdSig) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip archive: no end of central directory');
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('a central directory entry is damaged');
    const method = zip.readUInt16LE(p + 10);
    const compressed = zip.readUInt32LE(p + 20);
    const size = zip.readUInt32LE(p + 24);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const entry = zip.toString('utf8', p + 46, p + 46 + nameLen);
    if (entry === name) {
      if (zip.readUInt32LE(local) !== 0x04034b50) throw new Error(`the local header of ${name} is damaged`);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + compressed);
      const out = method === 0 ? Buffer.from(data) : method === 8 ? zlib.inflateRawSync(data) : null;
      if (!out) throw new Error(`${name} uses compression method ${method}`);
      if (out.length !== size) throw new Error(`${name} inflates to ${out.length} bytes; the archive says ${size}`);
      return out;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`the archive has no ${name}`);
}

/** Where the engine cache keeps the pinned binary. */
export const cachedBinary = (cacheDir, pin) => path.join(cacheDir, `cvc5-${pin.binarySha256.slice(0, 12)}`, 'cvc5');

async function fromCache(pin, cacheDir) {
  if (process.platform !== 'linux' || process.arch !== 'x64') {
    throw new EngineUnavailable(`the pinned cvc5 is the static Linux x86_64 build and this is ${process.platform} ${process.arch}; set STATESPACE_CVC5 to a binary whose SHA-256 is ${pin.binarySha256}`);
  }
  const bin = cachedBinary(cacheDir, pin);
  const dir = path.dirname(bin);
  if (fs.existsSync(bin) && sha256File(bin) === pin.binarySha256) return bin;
  const zipFile = await ensurePinned(cacheDir, pin.asset);
  let bytes;
  try {
    bytes = extractZipEntry(fs.readFileSync(zipFile), ENTRY);
  } catch (e) {
    throw new EngineUnavailable(`cannot take ${ENTRY} out of ${pin.asset.file}: ${e instanceof Error ? e.message : e}`);
  }
  fs.mkdirSync(dir, { recursive: true });
  const part = `${bin}.${process.pid}.part`;
  fs.writeFileSync(part, bytes, { mode: 0o755 });
  fs.renameSync(part, bin);
  const got = sha256File(bin);
  if (got !== pin.binarySha256) throw new EngineUnavailable(`${ENTRY} from ${pin.asset.file} has SHA-256 ${got}; ${pin.run} pins ${pin.binarySha256}`);
  return bin;
}

function onPath(env) {
  for (const dir of String(env.PATH ?? '').split(path.delimiter)) {
    if (!dir) continue;
    const p = path.join(dir, 'cvc5');
    try {
      if (fs.statSync(p).isFile()) return p;
    } catch {
      /* not here */
    }
  }
  return null;
}

/**
 * The pinned cvc5, ready to run: `{path, source, describe, pin, notes}`. Throws EngineUnavailable when no binary with
 * the pinned SHA-256 can be found or fetched, or when its version line is not the recorded one.
 */
export async function prepareCvc5({ cacheDir = defaultCacheDir(), env = process.env, repo = REPO } = {}) {
  const pin = readPin(repo);
  const notes = [];
  let bin;
  let source;
  if (env.STATESPACE_CVC5) {
    bin = path.resolve(env.STATESPACE_CVC5);
    if (!fs.existsSync(bin)) throw new EngineUnavailable(`STATESPACE_CVC5 (${bin}) does not exist`);
    const got = sha256File(bin);
    if (got !== pin.binarySha256) throw new EngineUnavailable(`STATESPACE_CVC5 has SHA-256 ${got}; ${pin.run} pins ${pin.binarySha256}`);
    source = 'STATESPACE_CVC5';
  } else {
    const found = onPath(env);
    if (found && sha256File(found) === pin.binarySha256) {
      bin = found;
      source = 'cvc5 on PATH';
    } else {
      if (found) notes.push(`the cvc5 on PATH is not the pinned binary (SHA-256 ${sha256File(found).slice(0, 12)}...), so the cached one is used`);
      try {
        bin = await fromCache(pin, cacheDir);
      } catch (e) {
        if (!(e instanceof EngineUnavailable) && ['EACCES', 'EPERM', 'EROFS', 'ENOSPC'].includes(e?.code)) {
          throw new EngineUnavailable(`cannot write the engine cache (${e.code}); set STATESPACE_ENGINE_CACHE to a directory that can be written`);
        }
        throw e;
      }
      source = `${pin.asset.file}, cached`;
    }
  }
  const v = await runProcess({ cmd: bin, args: ['--version'], timeoutS: 30, env });
  const first = String(v.stdout).split('\n')[0].trim();
  if (v.exitCode !== 0 || first !== pin.versionLine) {
    throw new EngineUnavailable(`${bin} --version printed "${first || (v.spawnError ?? v.stderr).trim()}"; ${pin.run} records "${pin.versionLine}"`);
  }
  return { path: bin, source, pin, notes, describe: `${first} (SHA-256 ${pin.binarySha256.slice(0, 12)}..., pinned by ${pin.run}; ${source})` };
}

// ------------------------------------------------------------------ queries
export const CVC5_TLIMIT_MS = 20000; // [D] a query cvc5 cannot settle in 20 s is reported as not cross-checked
const QUERY_FILE = 'query.smt2';

/** cvc5's command line for one query file, run from the file's folder. */
export const cvc5Args = (tlimitMs = CVC5_TLIMIT_MS) => ['--lang', 'smt2', '--incremental', '--produce-models', `--tlimit=${tlimitMs}`, QUERY_FILE];

/** Read cvc5's output: the verdict lines in order, and the error lines. */
export function parseCvc5Output(stdout) {
  const verdicts = [];
  const errors = [];
  for (const raw of String(stdout).split('\n')) {
    const line = raw.trim();
    if (line === 'sat' || line === 'unsat' || line === 'unknown') verdicts.push(line);
    else if (line.startsWith('(error')) errors.push(line.slice(0, 300));
  }
  return { verdicts, errors };
}

/**
 * Run one SMT-LIB text on cvc5. Never rejects: `{verdicts, errors, exitCode, timedOut, ms, detail}`, where detail says
 * why no verdict came back when none did.
 */
export async function runCvc5(cvc5, text, { tlimitMs = CVC5_TLIMIT_MS, env = process.env } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-cvc5-'));
  try {
    fs.writeFileSync(path.join(dir, QUERY_FILE), text);
    const r = await runProcess({ cmd: cvc5.path, args: cvc5Args(tlimitMs), timeoutS: Math.ceil(tlimitMs / 1000) + 15, env, cwd: dir });
    const { verdicts, errors } = parseCvc5Output(r.stdout);
    let detail = null;
    if (r.timedOut) detail = `cvc5 did not finish within ${Math.ceil(tlimitMs / 1000) + 15} s`;
    else if (r.spawnError) detail = `cvc5 could not start: ${r.spawnError}`;
    else if (verdicts.length === 0) detail = errors[0] ?? (`cvc5 printed no verdict (exit ${r.exitCode}): ${String(r.stderr).trim().split('\n').at(-1) ?? ''}`.trim());
    return { verdicts, errors, exitCode: r.exitCode, timedOut: r.timedOut, ms: r.durationMs, detail };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
