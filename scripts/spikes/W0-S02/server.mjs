// W0-S02: a static server that stands in for the two GitHub Pages sites (main origin and instrument origin),
// each on its own port, so that the instrument frame is cross-origin and same-site, as ARCHITECTURE.md
// section 5.2 plans. Dependency-free.
//
// Usage: node server.mjs --build <dir> [--main-port 8097] [--inst-port 8098] [--control-port 9000] [--bind 127.0.0.1] [--quiet]
//
// What it sends is what W0-S01 and W0-S08 found a static host sending: the right media type, no COOP, COEP or
// CORP headers, Access-Control-Allow-Origin: *, Cache-Control: public, max-age=600, an ETag with 304
// revalidation, and, to a client that accepts gzip, the gzip level 5 copy that build.mjs wrote (the encoding and
// level at which GitHub Pages' bytes matched, W0-S08). Every response is logged with the body bytes sent.
//
// Two things a real host cannot do and a measurement needs, both set through the control port, which listens on
// 127.0.0.1 only:
//   POST /link  {"bps": 1600000, "rttMs": 150}   shape every response body through one shared link (bps null = off):
//                                                each response waits one round trip, then its bytes leave in
//                                                16 KiB chunks, spaced so that all responses together never
//                                                exceed bps
//   POST /phase {"name": "...", "offline": ["inst"]}   tag requests with a phase name; sites listed as offline
//                                                answer every request with 503
//   GET  /log?phase=<name>, GET /log             the request log
// In --phone mode (the owner's measurement on a real device) the sites bind to every interface and the URLs to
// open are printed.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';

const { values: a } = parseArgs({
  options: {
    build: { type: 'string' }, 'main-port': { type: 'string', default: '8097' }, 'inst-port': { type: 'string', default: '8098' },
    'control-port': { type: 'string', default: '9000' }, bind: { type: 'string', default: '127.0.0.1' }, phone: { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
  },
});
if (!a.build) { console.error('usage: node server.mjs --build <dir> [--main-port N] [--inst-port N] [--control-port N] [--bind addr] [--phone] [--quiet]'); process.exit(2); }
const BUILD = path.resolve(a.build);
const BIND = a.phone ? '0.0.0.0' : a.bind;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm',
  '.zip': 'application/zip', '.whl': 'application/octet-stream',
};
const t00 = performance.now();
const startedAt = new Date().toUTCString();
let phase = 'none';
let offline = new Set();
let link = { bps: null, rttMs: 0 };
let linkFreeAt = 0;
const log = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = new Map();

function readCached(file) {
  if (!cache.has(file)) {
    const body = fs.readFileSync(file);
    cache.set(file, { body, etag: `"${crypto.createHash('sha1').update(body).digest('hex').slice(0, 16)}"` });
  }
  return cache.get(file);
}

async function sendBody(res, body, entry) {
  if (!link.bps || !body) { res.end(body || undefined); entry.sent_bytes = body ? body.length : 0; return; } // a 304 or a HEAD has no body to pace
  const CHUNK = 16384;
  for (let off = 0; off < body.length; off += CHUNK) {
    if (res.destroyed) return; // the browser closed the connection: stop sending, the entry keeps what was sent
    const part = body.subarray(off, off + CHUNK);
    const t = performance.now();
    linkFreeAt = Math.max(t, linkFreeAt) + (part.length * 8 * 1000) / link.bps;
    const wait = linkFreeAt - t;
    if (wait > 1) await sleep(wait);
    if (res.destroyed) return;
    entry.sent_bytes += part.length;
    if (!res.write(part)) await new Promise((r) => { res.once('drain', r); res.once('close', r); });
  }
  res.end();
}

function handler(site) {
  return async (req, res) => {
    try { await serve(site, req, res); } catch (err) {
      console.error(`server error on ${req.url}: ${err && err.stack}`);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  };
}

async function serve(site, req, res) {
  const t0 = performance.now();
  const url = new URL(req.url, 'http://x');
  const entry = { phase, site, path: url.pathname, status: 0, encoding: null, body_bytes: 0, sent_bytes: 0, raw_bytes: 0, t_ms: Math.round(t0 - t00), ms: 0 };
  log.push(entry);
  // a response the browser closed before its end: when, counted from the request, and how much had been sent
  res.on('close', () => { if (!res.writableFinished) entry.aborted_ms = Math.round(performance.now() - t0); });
  const done = async (status, headers, body) => {
    entry.status = status;
    entry.body_bytes = body ? body.length : 0;
    if (link.rttMs && status !== 304) await sleep(link.rttMs);
    res.writeHead(status, headers);
    await sendBody(res, body && req.method !== 'HEAD' ? body : null, entry);
    if (entry.aborted_ms == null) entry.ms = Math.round(performance.now() - t0); // an aborted response keeps ms at 0 and has aborted_ms
  };
  if (offline.has(site)) return done(503, { 'content-type': 'text/plain', 'cache-control': 'no-store' }, Buffer.from('offline (W0-S02 harness)\n'));
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const root = path.join(BUILD, site);
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return done(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }, Buffer.from('<!doctype html><title>404</title>\n'));
  }
  const wantsGzip = String(req.headers['accept-encoding'] || '').includes('gzip');
  const gzFile = path.join(BUILD, 'gz', site, `${path.relative(root, file)}.gz`);
  const useGz = wantsGzip && fs.existsSync(gzFile);
  const picked = readCached(useGz ? gzFile : file);
  entry.encoding = useGz ? 'gzip' : 'identity';
  entry.raw_bytes = fs.statSync(file).size;
  const headers = {
    'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
    'cache-control': 'public, max-age=600', 'access-control-allow-origin': '*', etag: picked.etag, 'last-modified': startedAt, vary: 'Accept-Encoding',
  };
  if (useGz) headers['content-encoding'] = 'gzip';
  if (req.headers['if-none-match'] === picked.etag) return done(304, headers, null);
  return done(200, { ...headers, 'content-length': picked.body.length }, picked.body);
}

const servers = [];
function listen(site, port) {
  return new Promise((resolve) => {
    const s = http.createServer(handler(site));
    s.keepAliveTimeout = 5000;
    s.listen(port, BIND, () => { servers.push(s); resolve(); });
  });
}
await listen('main', Number(a['main-port']));
await listen('instruments', Number(a['inst-port']));

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://control');
  const json = (obj) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  if (req.method === 'POST' && (url.pathname === '/phase' || url.pathname === '/link')) {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      const body = JSON.parse(data || '{}');
      if (url.pathname === '/phase') {
        phase = String(body.name || 'none');
        offline = new Set((body.offline || []).map((s) => (s === 'inst' ? 'instruments' : s)));
        return json({ phase, offline: [...offline] });
      }
      link = { bps: body.bps || null, rttMs: Number(body.rttMs) || 0 };
      linkFreeAt = 0;
      return json({ link });
    });
    return;
  }
  if (url.pathname === '/log') {
    const p = url.searchParams.get('phase');
    return json(p ? log.filter((r) => r.phase === p) : log);
  }
  res.writeHead(404);
  res.end();
}).listen(Number(a['control-port']), '127.0.0.1');

if (!a.quiet) {
  console.log(`main origin on port ${a['main-port']}, instrument origin on port ${a['inst-port']}, bound to ${BIND}`);
  if (a.phone) {
    console.log('Open this page on the device (the instrument origin is the same host on the other port):');
    for (const list of Object.values(os.networkInterfaces())) {
      for (const i of list || []) if (i.family === 'IPv4' && !i.internal) console.log(`  http://${i.address}:${a['main-port']}/`);
    }
    console.log('Over plain HTTP a phone gives this page no service worker and no Cache API; see the decision record, section 7, for HTTPS and for adb reverse.');
  }
}
