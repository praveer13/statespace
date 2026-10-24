// W0-S01: one HTTPS server for the stand-in hostnames, routed by Host header, with headers like
// GitHub Pages sends (no COOP/COEP, Access-Control-Allow-Origin: *, Cache-Control: max-age=600,
// ETag and Last-Modified with 304 revalidation, no compression). Dependency-free.
//
// Usage: node server.mjs <build-dir> <cert.pem> <key.pem> [port=443] [control-port=9000]
//
// The control port (HTTP on 127.0.0.1) lets the harness tag requests with the current phase and
// take hostnames offline (every request to them gets 503):
//   POST /phase {"name": "...", "offline": ["host", ...]}    GET /log?phase=<name>    GET /log
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [buildDir, certFile, keyFile, portArg, controlArg] = process.argv.slice(2);
if (!buildDir || !certFile || !keyFile) {
  console.error('usage: node server.mjs <build-dir> <cert.pem> <key.pem> [port] [control-port]');
  process.exit(2);
}
const PORT = Number(portArg || 443);
const CONTROL = Number(controlArg || 9000);

const ROUTES = {
  'course-domain.test': 'main',
  'instruments.course-domain.test': 'instruments',
  'instruments.other-host.test': 'instruments',
  'attacker.test': 'attacker',
};
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm', '.zip': 'application/zip', '.whl': 'application/octet-stream',
  '.bin': 'application/octet-stream',
};
const startedAt = new Date().toUTCString();
let phase = 'none';
let offline = new Set();
const requests = [];

function serve(req, res) {
  const host = String(req.headers.host || '').split(':')[0];
  const url = new URL(req.url, `https://${host}`);
  const entry = { phase, host, path: url.pathname, status: 0, bytes: 0, dest: req.headers['sec-fetch-dest'] || null };
  requests.push(entry);
  const done = (status, headers = {}, body = null) => {
    entry.status = status;
    entry.bytes = body ? body.length : 0;
    res.writeHead(status, headers);
    res.end(body);
  };
  if (offline.has(host)) return done(503, { 'content-type': 'text/plain' }, Buffer.from('offline (W0-S01 harness)\n'));
  const site = ROUTES[host];
  if (!site) return done(421, { 'content-type': 'text/plain' }, Buffer.from('unknown host\n'));
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const root = path.join(buildDir, site);
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return done(404, { 'content-type': 'text/html; charset=utf-8' }, Buffer.from('<!doctype html><title>404</title>\n'));
  }
  const body = fs.readFileSync(file);
  const etag = `"${crypto.createHash('sha1').update(body).digest('hex').slice(0, 16)}"`;
  const headers = {
    'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
    'cache-control': 'max-age=600',
    'access-control-allow-origin': '*',
    etag,
    'last-modified': startedAt,
    vary: 'Accept-Encoding',
  };
  if (req.headers['if-none-match'] === etag) return done(304, headers);
  return done(200, { ...headers, 'content-length': body.length }, req.method === 'HEAD' ? null : body);
}

https.createServer({ cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }, serve)
  .listen(PORT, () => console.log(`https on :${PORT}`));

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://control');
  if (req.method === 'POST' && url.pathname === '/phase') {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      const body = JSON.parse(data || '{}');
      phase = String(body.name || 'none');
      offline = new Set(body.offline || []);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ phase, offline: [...offline] }));
    });
    return;
  }
  if (url.pathname === '/log') {
    const p = url.searchParams.get('phase');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(p ? requests.filter((r) => r.phase === p) : requests));
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(CONTROL, '127.0.0.1', () => console.log(`control on 127.0.0.1:${CONTROL}`));
