#!/usr/bin/env node
// W0-S08: serve the harness for a real device on the local network (the owner's phone measurement).
//
//   npm ci --prefix scripts/spikes/W0-S08 --ignore-scripts
//   node scripts/spikes/W0-S08/precompress.mjs --dist scripts/spikes/W0-S08/node_modules/@electric-sql/pglite/dist --out <dir> --level 5
//   node scripts/spikes/W0-S08/phone-server.mjs --gz-dir <dir> [--port 8099]
//
// then open http://<this machine>:8099/phone.html on the device. The page's SET ROLE differential hashes with
// crypto.subtle, which needs a secure context: use https, or on Android run `adb reverse tcp:8099 tcp:8099` and open
// http://localhost:8099/phone.html. The first-load and specimen buttons work in any context.
// It sends the gzip copies made by precompress.mjs (what GitHub Pages sends, to the byte) and no isolation headers.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'

const { values: a } = parseArgs({ options: { 'gz-dir': { type: 'string' }, port: { type: 'string', default: '8099' }, pglite: { type: 'string', default: 'node_modules/@electric-sql/pglite/dist' } } })
const here = path.dirname(fileURLToPath(import.meta.url))
const routes = [
  { prefix: '/pglite/', dir: path.resolve(here, a.pglite), gz: a['gz-dir'] ? path.resolve(a['gz-dir']) : null },
  { prefix: '/spec/', dir: here, gz: null },
  { prefix: '/', dir: path.join(here, 'browser'), gz: null },
]
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.json': 'application/json' }
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const route = routes.find((r) => url.pathname.startsWith(r.prefix))
  const rel = decodeURIComponent(url.pathname.slice(route.prefix.length)) || 'phone.html'
  const file = path.join(route.dir, rel)
  if (!file.startsWith(route.dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return }
  const gz = route.gz && String(req.headers['accept-encoding'] || '').includes('gzip') && fs.existsSync(path.join(route.gz, rel + '.gz')) ? path.join(route.gz, rel + '.gz') : null
  const body = fs.readFileSync(gz ?? file)
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store', ...(gz ? { 'Content-Encoding': 'gzip' } : {}) })
  res.end(body)
}).listen(Number(a.port), '0.0.0.0', () => console.log(`serving on port ${a.port}; open /phone.html from the device${a['gz-dir'] ? '' : ' (no --gz-dir: files are sent uncompressed, so the wire size is the raw size)'}`))
