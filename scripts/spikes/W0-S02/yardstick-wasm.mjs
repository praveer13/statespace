// W0-S02: assemble the CPU yardstick's WebAssembly module and check it against the JavaScript loop.
//
// Usage: node yardstick-wasm.mjs [--check]
//
// The module exports f(n): n steps of xorshift32 and a running sum, the same arithmetic as jsLoop in
// site/instruments/b/BUILD/worker.mjs. Without --check this prints the module as the byte array that
// worker.mjs embeds. With --check it fails unless the module validates, matches the JavaScript loop on
// two inputs, and the embedded array equals what this file assembles.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const sleb = (n) => { const out = []; for (;;) { const b = n & 0x7f; n >>= 7; if ((n === 0 && !(b & 0x40)) || (n === -1 && (b & 0x40))) { out.push(b); return out; } out.push(b | 0x80); } };
const uleb = (n) => { const out = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; out.push(b); } while (n); return out; };
const op = { block: 0x02, loop: 0x03, br: 0x0c, br_if: 0x0d, end: 0x0b, local_get: 0x20, local_set: 0x21, i32_const: 0x41, i32_geu: 0x4f, i32_add: 0x6a, i32_and: 0x71, i32_xor: 0x73, i32_shl: 0x74, i32_shru: 0x76 };
const get = (i) => [op.local_get, ...uleb(i)];
const set = (i) => [op.local_set, ...uleb(i)];
const c = (v) => [op.i32_const, ...sleb(v)];
const X = 1, S = 2, I = 3; // local 0 is the parameter n
const step = (shift, k) => [...get(X), ...get(X), ...c(k), shift, op.i32_xor, ...set(X)];
const body = [
  1, 3, 0x7f,
  ...c(123456789), ...set(X),
  op.block, 0x40, op.loop, 0x40,
  ...get(I), ...get(0), op.i32_geu, op.br_if, 1,
  ...step(op.i32_shl, 13), ...step(op.i32_shru, 17), ...step(op.i32_shl, 5),
  ...get(S), ...get(X), ...c(255), op.i32_and, op.i32_add, ...set(S),
  ...get(I), ...c(1), op.i32_add, ...set(I),
  op.br, 0, op.end, op.end,
  ...get(S), op.end,
];
const code = [1, ...uleb(body.length), ...body];
export const BYTES = [
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x06, 0x01, 0x60, 0x01, 0x7f, 0x01, 0x7f,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x05, 0x01, 0x01, 0x66, 0x00, 0x00,
  0x0a, ...uleb(code.length), ...code,
];

const jsLoop = (n) => { let x = 123456789 | 0; let s = 0; for (let i = 0; i < n; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s = (s + (x & 255)) | 0; } return s; };
const fmt = (a) => a.map((b) => '0x' + b.toString(16).padStart(2, '0')).join(', ');

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    const fail = (m) => { console.error('FAIL:', m); process.exit(1); };
    if (!WebAssembly.validate(new Uint8Array(BYTES))) fail('the module does not validate');
    const { instance } = await WebAssembly.instantiate(new Uint8Array(BYTES));
    for (const n of [1000, 1_000_000]) if (instance.exports.f(n) !== jsLoop(n)) fail(`f(${n}) differs from the JavaScript loop`);
    const worker = fs.readFileSync(new URL('./site/instruments/b/BUILD/worker.mjs', import.meta.url), 'utf8');
    const m = /const WASM_LOOP = new Uint8Array\(\[([\s\S]*?)\]\);/.exec(worker);
    if (!m) fail('worker.mjs has no WASM_LOOP');
    const embedded = m[1].replace(/\/\/[^\n]*/g, '').split(',').map((s) => s.trim()).filter(Boolean).map(Number);
    if (embedded.length !== BYTES.length || embedded.some((v, i) => v !== BYTES[i])) fail('the array in worker.mjs differs from this assembler\'s output');
    console.log(`ok: ${BYTES.length} bytes validate, f(1000) = ${jsLoop(1000)} and f(1000000) = ${jsLoop(1_000_000)} equal the JavaScript loop, and worker.mjs embeds this exact array`);
  } else {
    for (let i = 0; i < BYTES.length; i += 16) console.log('  ' + fmt(BYTES.slice(i, i + 16)) + ',');
  }
}
