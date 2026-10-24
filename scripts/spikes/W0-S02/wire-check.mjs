#!/usr/bin/env node
// W0-S02: what a real host sends for the six engine files, against the build's manifest. Dependency-free.
//
//   node wire-check.mjs <instrument-origin> [<build-id>]
//
// For each file in b/<build-id>/manifest.json (the build id is read from <origin>/b/ when it is omitted: pass it, since a
// static host lists no directories), this asks for the file with "Accept-Encoding: gzip, br", prints the encoding and
// the Content-Length the host sent, and checks that the decoded bytes have the manifest's SHA-256. The manifest's
// "wire" column is stock zlib level 5, the encoding at which GitHub Pages' bytes matched four small public files
// (RUN-pglite-0511); this shows whether it holds for the large files, which no run has measured there.
// The first load, as OD-6 counts it, is the sum of the Content-Length column.
import crypto from 'node:crypto';

const [origin, build] = process.argv.slice(2);
if (!origin || !build) { console.error('usage: node wire-check.mjs <instrument-origin> <build-id>'); process.exit(2); }
const base = `${origin.replace(/\/$/, '')}/b/${build}`;
const manifest = await (await fetch(`${base}/manifest.json`, { headers: { 'accept-encoding': 'gzip, br' } })).json();
const rows = [];
let sent = 0;
let allHashes = true;
for (const a of manifest.engines.z3.assets) {
  const url = `${origin.replace(/\/$/, '')}${a.path}`;
  const res = await fetch(url, { headers: { 'accept-encoding': 'gzip, br' } });
  const body = Buffer.from(await res.arrayBuffer());
  const hash = crypto.createHash('sha256').update(body).digest('hex');
  const len = res.headers.has('content-length') ? Number(res.headers.get('content-length')) : null;
  sent += len ?? 0;
  if (hash !== a.sha256) allHashes = false;
  rows.push({
    file: a.path.split('/').pop(), status: res.status, encoding: res.headers.get('content-encoding') || 'identity', content_length: len,
    raw: a.bytes, gzip5: a.wire, brotli11: a.brotli11, same_as: len === a.wire ? 'gzip level 5' : len === a.brotli11 ? 'Brotli 11' : len === a.bytes ? 'raw' : 'other', hash_ok: hash === a.sha256,
  });
}
console.table(rows);
console.log(`sent in all: ${sent} bytes (the manifest's gzip level 5 total is ${manifest.engines.z3.wireBytes}, raw ${manifest.engines.z3.bytes}); decoded bytes match the manifest: ${allHashes}`);
if (!allHashes) process.exitCode = 1;
