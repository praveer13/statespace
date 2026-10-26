// Tests of the engine layer (lib/engines.mjs): the pins, the process runner, and the two real engines.
// Run: node --test scripts/spikes/W1-T42/engines.test.mjs
//
// The two engine tests start the real engines. They download the pinned files into the engine cache on first use
// (STATESPACE_ENGINE_CACHE, default .cache/statespace-engines), which needs the network once; W1T42_NO_ENGINES=1 skips them.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PINS as W0S02 } from '../W0-S02/fetch-engines.mjs';
import { EngineUnavailable, PROBE_PROGRAM, PINS, REPO, createEngines, ensurePinned, parseProbe, runProcess, withScratchDir } from './lib/engines.mjs';
import { inDirectory, scratchDir } from './lib/fixtures.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const skipEngines = process.env.W1T42_NO_ENGINES === '1' ? 'W1T42_NO_ENGINES=1' : false;

test('the pins are the ones W0-S02, W0-S03, the Bench lock and the recorded runs hold', () => {
  const deps = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'W0-S03', 'deps.json'), 'utf8'));
  assert.equal(PINS.nativeWheel.sha256, deps.z3_native_wheel.sha256);
  assert.equal(PINS.nativeWheel.file, deps.z3_native_wheel.file);
  assert.equal(PINS.nativeWheel.url, deps.z3_native_wheel.url);
  assert.equal(PINS.wasmWheel.sha256, deps.z3_wasm_wheel.sha256);
  assert.equal(PINS.wasmWheel.file, deps.z3_wasm_wheel.file);
  assert.equal(PINS.wasmWheel.url, deps.z3_wasm_wheel.url);
  assert.equal(PINS.wasmWheel.sha256, W0S02.z3.sha256);
  assert.equal(PINS.wasmWheel.url, W0S02.z3.url);
  assert.equal(PINS.pyodide.version, W0S02.pyodide.version);
  assert.equal(PINS.pyodide.url, W0S02.pyodide.url);
  assert.equal(PINS.pyodide.integrity, W0S02.pyodide.integrity);

  // The Bench installs the same wheel: bench/uv.lock lists both hashes.
  const lock = fs.readFileSync(path.join(REPO, 'bench', 'uv.lock'), 'utf8');
  assert.ok(lock.includes(`hash = "sha256:${PINS.nativeWheel.sha256}"`), 'bench/uv.lock holds the native wheel');
  assert.ok(lock.includes(`hash = "sha256:${PINS.wasmWheel.sha256}"`), 'bench/uv.lock holds the wasm wheel');
  assert.ok(lock.includes(`name = "z3-solver"\nversion = "${PINS.z3.wheelVersion}"`));

  // RUN-fixedpoint-equal recorded the same two wheels for the same pair.
  const run = JSON.parse(fs.readFileSync(path.join(REPO, 'runs', 'RUN-fixedpoint-equal.json'), 'utf8'));
  const hashes = new Set((run.configs ?? []).map((c) => c.binary_sha256));
  assert.ok(hashes.has(PINS.nativeWheel.sha256) && hashes.has(PINS.wasmWheel.sha256));
  assert.ok(PINS.z3.wheelVersion.startsWith(PINS.z3.versionString));
});

test('runProcess returns what a program printed, and its exit status', async () => {
  const r = await runProcess({ cmd: process.execPath, args: ['-e', "process.stdin.on('data', (d) => process.stdout.write(String(d).toUpperCase())); process.stdin.on('end', () => process.exit(3))"], input: 'abc' });
  assert.equal(r.stdout, 'ABC');
  assert.equal(r.exitCode, 3);
  assert.equal(r.timedOut, false);
});

test('runProcess stops a program that never ends, and keeps what it printed first', async () => {
  const started = Date.now();
  const r = await runProcess({ cmd: process.execPath, args: ['-e', "console.log('before'); setInterval(() => {}, 1000)"], timeoutS: 1 });
  assert.equal(r.timedOut, true);
  assert.match(r.stdout, /before/);
  assert.ok(Date.now() - started < 10000);
});

test('runProcess reports a program that does not exist, and never throws', async () => {
  const r = await runProcess({ cmd: '/nonexistent/statespace-w1t42', args: [] });
  assert.equal(r.exitCode, null);
  assert.ok(r.spawnError);
});

test('runProcess runs a program in the directory it is given', async () => {
  const dir = scratchDir('cwd-');
  const r = await runProcess({ cmd: process.execPath, args: ['-e', 'console.log(process.cwd())'], cwd: dir });
  assert.equal(r.stdout.trim(), fs.realpathSync(dir));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a scratch directory is empty, is its own for every call, and is gone after the call however it ends', async () => {
  const seen = [];
  for (let i = 0; i < 2; i++) {
    await withScratchDir(async (dir) => {
      assert.deepEqual(fs.readdirSync(dir), [], 'it starts empty');
      fs.mkdirSync(path.join(dir, 'smt2'));
      fs.writeFileSync(path.join(dir, 'smt2', 'q.smt2'), 'x');
      seen.push(dir);
    });
  }
  await assert.rejects(
    withScratchDir(async (dir) => {
      seen.push(dir);
      throw new Error('planted');
    }),
    /planted/,
  );
  assert.equal(new Set(seen).size, 3, 'each call has a directory of its own');
  for (const dir of seen) assert.ok(!fs.existsSync(dir), 'and it is removed afterwards');
});

test('a scratch directory that cannot be made is an engine that cannot be set up, with the way out named', async () => {
  const parent = scratchDir('no-tmp-');
  const before = process.env.TMPDIR;
  process.env.TMPDIR = path.join(parent, 'absent', 'deeper');
  try {
    await assert.rejects(
      withScratchDir(async () => 'unreachable'),
      (e) => e instanceof EngineUnavailable && /set TMPDIR/.test(e.message) && /ENOENT/.test(e.message) && !e.message.includes('absent'),
    );
  } finally {
    if (before === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = before;
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('the probe program names the engine in one line', () => {
  assert.match(PROBE_PROGRAM, /PROBE /);
  assert.deepEqual(parseProbe('noise\nPROBE {"z3":"5.3.1","python":"3.13.12","platform":"linux"}\n'), { z3: '5.3.1', python: '3.13.12', platform: 'linux' });
  assert.equal(parseProbe('no probe here'), null);
  assert.equal(parseProbe('PROBE {broken'), null);
});

test('a cache directory that cannot be written is an engine that cannot be set up, with the way out named', async () => {
  const dir = scratchDir('cache-');
  const file = path.join(dir, 'a-file');
  fs.writeFileSync(file, 'x');
  const engines = createEngines({ cacheDir: path.join(file, 'cache'), env: { ...process.env, STATESPACE_PYODIDE_DIR: '' } });
  await assert.rejects(engines.pyodide(), (e) => e instanceof EngineUnavailable && /set STATESPACE_ENGINE_CACHE/.test(e.message) && !e.message.includes(dir));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a pin that the download does not match is refused, and nothing is kept', async () => {
  const dir = scratchDir('cache-');
  const spec = { file: 'x.bin', url: 'data:application/octet-stream;base64,aGVsbG8=', sha256: '0'.repeat(64) };
  await assert.rejects(ensurePinned(dir, spec), (e) => e instanceof EngineUnavailable && /has SHA-256 2cf24dba/.test(e.message));
  assert.ok(!fs.existsSync(path.join(dir, 'x.bin')));
  const good = { ...spec, sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' };
  const file = await ensurePinned(dir, good);
  assert.equal(fs.readFileSync(file, 'utf8'), 'hello');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the native engine runs a z3py program at the pin', { skip: skipEngines }, async () => {
  const native = await createEngines().native();
  assert.equal(native.probe.z3, PINS.z3.versionString);
  const r = await native.run({ source: 'import z3\nx = z3.Int("x")\ns = z3.Solver()\ns.add(x * x == 49, x > 0)\nprint(s.check(), s.model())\n' });
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(r.stdout, 'sat [x = 7]\n');
});

test('the Pyodide engine runs the same program, loaded as the tab loads it, and a program that hangs is stopped', { skip: skipEngines }, async () => {
  const pyodide = await createEngines().pyodide();
  assert.equal(pyodide.probe.z3, PINS.z3.versionString);
  assert.equal(pyodide.pyodideVersion, PINS.pyodide.version);
  const r = await pyodide.run({ source: 'import z3\nx = z3.Int("x")\ns = z3.Solver()\ns.add(x * x == 49, x > 0)\nprint(s.check(), s.model())\n' });
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(r.stdout, 'sat [x = 7]\n');
  const raised = await pyodide.run({ source: 'raise ValueError("planted")\n' });
  assert.equal(raised.exitCode, 1);
  assert.match(raised.stderr, /ValueError: planted/);
  // Z3's timeout never returns under Pyodide [X RUN-z3-budget-pyodide]: the watchdog is what ends it.
  const hung = await pyodide.run({ source: 'import z3\nx, y, z = z3.Ints("x y z")\ns = z3.Solver()\ns.set("timeout", 500)\ns.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)\nprint(s.check())\n', timeoutS: 6 });
  assert.equal(hung.timedOut, true);
});

// A z3py script that saves its queries beside itself (the W1-T12 scripts write smt2/<query>.smt2) must not write them into
// the directory a gate was started in. These are the engine-level halves of reproduce.test.mjs's tests of the same thing.
const WRITES_BESIDE_ITSELF = 'import os\nprint(os.getcwd())\nos.makedirs("smt2", exist_ok=True)\nwith open("smt2/q.smt2", "w") as f:\n    f.write("x")\n';

test('the native engine runs a program in a scratch directory of its own, which goes with it, unless it is given one', { skip: skipEngines }, async () => {
  const native = await createEngines().native();
  const here = scratchDir('caller-');
  const given = scratchDir('given-');
  try {
    const r = await inDirectory(here, () => native.run({ source: WRITES_BESIDE_ITSELF }));
    assert.equal(r.exitCode, 0, r.stderr);
    const where = r.stdout.trim();
    assert.notEqual(where, fs.realpathSync(here), 'not the directory the caller stands in');
    assert.ok(!fs.existsSync(where), 'and gone afterwards');
    assert.deepEqual(fs.readdirSync(here), [], 'so nothing reached the caller\'s directory');

    // A directory the caller names is the program's, and stays the caller's to clean up.
    const named = await native.run({ source: WRITES_BESIDE_ITSELF, cwd: given });
    assert.equal(named.stdout.trim(), fs.realpathSync(given));
    assert.ok(fs.existsSync(path.join(given, 'smt2', 'q.smt2')));

    // A file path is the caller's, not the program's: a relative one is resolved before the program moves.
    fs.writeFileSync(path.join(here, 'where.py'), 'import os\nprint(os.getcwd())\n');
    const byFile = await inDirectory(here, () => native.run({ file: 'where.py', cwd: given }));
    assert.equal(byFile.exitCode, 0, byFile.stderr);
    assert.equal(byFile.stdout.trim(), fs.realpathSync(given));
  } finally {
    fs.rmSync(here, { recursive: true, force: true });
    fs.rmSync(given, { recursive: true, force: true });
  }
});

test('a program under Pyodide writes into memory: nothing reaches the directory the caller stands in', { skip: skipEngines }, async () => {
  const pyodide = await createEngines().pyodide();
  const here = scratchDir('caller-');
  try {
    const program = 'import os\nos.makedirs("smt2", exist_ok=True)\nwith open("smt2/q.smt2", "w") as f:\n    f.write("x")\nprint(sorted(os.listdir("smt2")))\n';
    const r = await inDirectory(here, () => pyodide.run({ source: program }));
    assert.equal(r.exitCode, 0, r.stderr);
    assert.equal(r.stdout, "['q.smt2']\n");
    assert.deepEqual(fs.readdirSync(here), []);
  } finally {
    fs.rmSync(here, { recursive: true, force: true });
  }
});
