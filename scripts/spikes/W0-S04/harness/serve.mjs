// W0-S04: a static server standing in for the instrument origin.
//   /spectacle/*  Spectacle at the pinned commit (from the cache)
//   /harness/*    this folder
//   /specs/*      the TLC work tree (specs, including the translated PlusCal module)
//   /jobs/*       harness jobs built by tlc.mjs
// Every response carries a strict Content-Security-Policy (connect-src 'self')
// and no-store; every request is logged, so the run record can show which
// module files Spectacle fetched and that nothing left the origin.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'";
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json', '.tla': 'text/plain; charset=utf-8' };

export function startServer({ port, roots, csp = true }) {
  const log = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/__log') {
      const out = log.splice(0, log.length);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
      return;
    }
    const seg = url.pathname.split('/')[1];
    const root = roots[seg];
    let status = 404;
    let body = 'not found';
    let type = 'text/plain; charset=utf-8';
    if (root) {
      const rel = decodeURIComponent(url.pathname.slice(seg.length + 2));
      const file = path.resolve(root, rel);
      if (file.startsWith(path.resolve(root) + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        status = 200;
        body = fs.readFileSync(file);
        type = TYPES[path.extname(file)] || 'application/octet-stream';
      }
    }
    log.push({ path: url.pathname, status });
    const headers = { 'content-type': type, 'cache-control': 'no-store' };
    if (csp) headers['content-security-policy'] = CSP;
    res.writeHead(status, headers);
    res.end(body);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, log })));
}
