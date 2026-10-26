// W1-T37: the cvc5 pin, the release asset's unpacking, and reading cvc5's output. The last test runs the pinned
// binary itself (fetched into the engine cache on first use).
//   node --test scripts/spikes/W1-T37/cvc5.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import zlib from 'node:zlib';
import { cvc5Args, extractZipEntry, parseCvc5Output, prepareCvc5, readPin, runCvc5 } from './lib/cvc5.mjs';
import { REPO } from './lib/engines.mjs';
import { runProcess } from '../W1-T42/lib/engines.mjs';

/** A zip archive of the given entries, deflated or stored. */
function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data, stored = false } of entries) {
    const body = stored ? data : zlib.deflateRawSync(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt32LE(zlib.crc32(data), 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt32LE(zlib.crc32(data), 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, body);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

test('the pin is read from RUN-scaffold, the record that executed the Bench binary', () => {
  const pin = readPin();
  const record = JSON.parse(fs.readFileSync(path.join(REPO, 'runs', 'RUN-scaffold.json'), 'utf8'));
  assert.equal(pin.versionLine, record.values.cvc5_version_line);
  assert.equal(pin.binarySha256, record.values.cvc5_binary_sha256);
  assert.equal(pin.asset.sha256, record.values.cvc5_asset_sha256);
  assert.equal(pin.asset.file, record.values.cvc5_asset);
  assert.match(pin.asset.url, /^https:\/\/github\.com\/cvc5\/cvc5\/releases\/download\/cvc5-1\.4\.2\//);
});

test('a missing or damaged pin is an engine that cannot be set up', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-pin-'));
  try {
    assert.throws(() => readPin(root), /cannot read the cvc5 pin/);
    fs.mkdirSync(path.join(root, 'runs'));
    fs.writeFileSync(path.join(root, 'runs', 'RUN-scaffold.json'), JSON.stringify({ configs: [{ id: 'bench-cvc5-version', version: 'x' }] }));
    assert.throws(() => readPin(root), /no usable bench-cvc5-version/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('one entry comes out of a zip archive, deflated or stored, and a missing entry is said to be missing', () => {
  const bin = Buffer.from('#!/bin/sh\necho cvc5\n'.repeat(50));
  const zip = makeZip([{ name: 'cvc5-Linux-x86_64-static/COPYING', data: Buffer.from('license') }, { name: 'cvc5-Linux-x86_64-static/bin/cvc5', data: bin }, { name: 'plain.txt', data: Buffer.from('as is'), stored: true }]);
  assert.deepEqual(extractZipEntry(zip, 'cvc5-Linux-x86_64-static/bin/cvc5'), bin);
  assert.equal(extractZipEntry(zip, 'plain.txt').toString(), 'as is');
  assert.throws(() => extractZipEntry(zip, 'nope'), /has no nope/);
  assert.throws(() => extractZipEntry(Buffer.from('not a zip at all, just bytes'), 'x'), /not a zip archive/);
});

test("cvc5's verdict lines are read in order, its errors kept, its warnings ignored", () => {
  const out = 'sat\n(\n(define-fun a () Int 0)\n)\nunsat\n(error "cannot get model unless after a SAT or UNKNOWN response.")\nunknown\n';
  assert.deepEqual(parseCvc5Output(out), { verdicts: ['sat', 'unsat', 'unknown'], errors: ['(error "cannot get model unless after a SAT or UNKNOWN response.")'] });
  assert.deepEqual(parseCvc5Output(''), { verdicts: [], errors: [] });
});

test('the pinned cvc5 runs, refutes an unsat query and finds a sat one', async () => {
  const cvc5 = await prepareCvc5();
  assert.match(cvc5.describe, /^cvc5 1\.4\.2 \[git 282d5e0 on branch HEAD\]/);
  const unsat = await runCvc5(cvc5, '(declare-const a Int)\n(declare-const amount Int)\n(assert (> amount 0))\n(assert (<= amount a))\n(assert (< (- a amount) 0))\n(check-sat)\n');
  assert.deepEqual(unsat.verdicts, ['unsat']);
  const sat = await runCvc5(cvc5, '(declare-const a Int)\n(assert (> a 2))\n(check-sat)\n(get-model)\n');
  assert.deepEqual(sat.verdicts, ['sat']);
  const broken = await runCvc5(cvc5, '(assert (> undeclared 2))\n(check-sat)\n');
  assert.deepEqual(broken.verdicts, []);
  assert.ok(broken.detail, 'a query cvc5 cannot read says why');
});

test('the pinned cvc5 answers every query of a script, in order: several check-sat commands, push and pop', async () => {
  assert.ok(cvc5Args().includes('--incremental'), 'without it cvc5 refuses every query after the first');
  const cvc5 = await prepareCvc5();
  // D-13's starter, checked, then checked again once the guard is asserted
  const starter = '(declare-const a Int)\n(declare-const b Int)\n(declare-const amount Int)\n(assert (and (>= a 0) (>= b 0) (> amount 0)))\n(assert (< (- a amount) 0))\n';
  const two = await runCvc5(cvc5, `${starter}(check-sat)\n(assert (<= amount a))\n(check-sat)\n`);
  assert.deepEqual([two.verdicts, two.errors, two.exitCode], [['sat', 'unsat'], [], 0]);
  const scoped = await runCvc5(cvc5, '(declare-const a Int)\n(declare-const amount Int)\n(assert (> amount 0))\n(push 1)\n(assert (< (- a amount) 0))\n(check-sat)\n(assert (<= amount a))\n(check-sat)\n(pop 1)\n(assert (<= amount a))\n(check-sat)\n');
  assert.deepEqual([scoped.verdicts, scoped.errors], [['sat', 'unsat', 'sat'], []]);
  // without --incremental, the same binary answers the first query and refuses the rest
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-noinc-'));
  try {
    fs.writeFileSync(path.join(dir, 'query.smt2'), `${starter}(check-sat)\n(assert (<= amount a))\n(check-sat)\n`);
    const plain = await runProcess({ cmd: cvc5.path, args: cvc5Args().filter((a) => a !== '--incremental'), timeoutS: 60, cwd: dir });
    assert.deepEqual(parseCvc5Output(plain.stdout).verdicts, ['sat']);
    assert.match(plain.stdout, /cannot make multiple queries unless incremental solving is enabled/);
    fs.writeFileSync(path.join(dir, 'query.smt2'), `${starter}(push 1)\n(check-sat)\n(pop 1)\n`);
    const pushed = await runProcess({ cmd: cvc5.path, args: cvc5Args().filter((a) => a !== '--incremental'), timeoutS: 60, cwd: dir });
    assert.deepEqual(parseCvc5Output(pushed.stdout).verdicts, []);
    assert.match(pushed.stdout, /cannot push when not solving incrementally/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the pinned cvc5 goes on past a command that fails, and stops at a parse error, where Z3 goes on', async () => {
  const cvc5 = await prepareCvc5();
  // a get-model after unsat, a get-info out of place: an error line, then the rest
  const past = await runCvc5(cvc5, '(declare-const a Int)\n(assert (> a 0))\n(assert (< a 0))\n(check-sat)\n(get-model)\n(get-info :reason-unknown)\n(check-sat)\n');
  assert.deepEqual([past.verdicts, past.errors.length], [['unsat', 'unsat'], 2]);
  // an undeclared symbol, a sort error, a command it does not know, a pop past the stack: an error line, and nothing after
  // it (Z3 reports each and goes on to unsat: harness.test.mjs), so the gate never hands cvc5 a command Z3 rejected
  for (const bad of ['(assert (> b 0))', '(assert (+ a 1))', '(minimize a)', '(pop 3)']) {
    const r = await runCvc5(cvc5, `(declare-const a Int)\n${bad}\n(assert (> a 0))\n(assert (< a 0))\n(check-sat)\n`);
    assert.deepEqual(r.verdicts, [], bad);
    assert.equal(r.errors.length, 1, bad);
    assert.match(r.errors[0], /^\(error "(Parse Error: query\.smt2:2\.|Expected term with sort Bool)/, bad);
  }
});

test('a query cvc5 cannot read is reported by the query file name, never by a machine path', async () => {
  const cvc5 = await prepareCvc5();
  const broken = await runCvc5(cvc5, '(declare-const a Int)\n(assert (> a 2)\n(check-sat)\n');
  assert.deepEqual(broken.verdicts, []);
  assert.ok(broken.detail, 'it says why');
  assert.ok(!broken.detail.includes(os.tmpdir()) && !broken.detail.includes(REPO), broken.detail);
  for (const e of broken.errors) assert.ok(!e.includes(os.tmpdir()), e);
});

test('STATESPACE_CVC5 must be the pinned binary', async () => {
  const fake = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-fake-')), 'cvc5');
  fs.writeFileSync(fake, '#!/bin/sh\necho "cvc5 1.4.2 [git 282d5e0 on branch HEAD]"\n', { mode: 0o755 });
  try {
    await assert.rejects(prepareCvc5({ env: { ...process.env, STATESPACE_CVC5: fake } }), /STATESPACE_CVC5 has SHA-256 [0-9a-f]{64}; RUN-scaffold pins/);
  } finally {
    fs.rmSync(path.dirname(fake), { recursive: true, force: true });
  }
});

test('a cvc5 on PATH that is not the pinned binary is passed over, and the report says so', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t37-path-'));
  fs.writeFileSync(path.join(dir, 'cvc5'), '#!/bin/sh\necho "cvc5 9.9.9"\n', { mode: 0o755 });
  try {
    const cvc5 = await prepareCvc5({ env: { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH}` } });
    assert.notEqual(cvc5.path, path.join(dir, 'cvc5'));
    assert.ok(cvc5.notes.some((n) => /not the pinned binary/.test(n)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
