// W0-S08: a static file server that stands in for the instrument origin's host.
//
// It sends what a static host such as GitHub Pages sends and nothing more: the right media type, a short
// Cache-Control, an optional Content-Encoding, and no COOP, COEP or CORP headers (so nothing here relies on
// cross-origin isolation). Each response is logged with the body bytes actually sent.
//
// routes: [{ prefix: '/pglite/', dir, gzDir? }, ...]; the first prefix that matches wins.
// The encoding can be changed between requests: identity, or gzip. A client that does not send "gzip" in
// Accept-Encoding gets identity. In gzip mode a route with a gzDir sends the file's precompressed copy
// (<gzDir>/<path>.gz, written by precompress.mjs); otherwise the server compresses at gzipLevel with its own zlib.
// The log records which of the two produced each body.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.json': 'application/json', '.map': 'application/json',
}

export function compress(buf, encoding, level = 6) {
  if (encoding === 'gzip') return zlib.gzipSync(buf, { level })
  if (encoding === 'br') return zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } })
  return buf
}

export function startServer({ routes, encoding = 'identity', gzipLevel = 6 }) {
  const state = { encoding, gzipLevel }
  const log = []
  const cache = new Map()
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    const route = routes.find((r) => url.pathname.startsWith(r.prefix))
    const file = route ? path.join(route.dir, decodeURIComponent(url.pathname.slice(route.prefix.length))) : null
    if (!file || !file.startsWith(route.dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      log.push({ path: url.pathname, status: 404, encoding: null, body_bytes: 0, raw_bytes: 0 })
      res.writeHead(404); res.end(); return
    }
    const raw = fs.readFileSync(file)
    const accepts = String(req.headers['accept-encoding'] || '')
    const effective = state.encoding === 'gzip' && accepts.includes('gzip') ? 'gzip' : 'identity'
    const pre = effective === 'gzip' && route.gzDir ? path.join(route.gzDir, url.pathname.slice(route.prefix.length) + '.gz') : null
    const usePre = pre && fs.existsSync(pre)
    const key = file + '|' + effective + '|' + (usePre ? 'pre' : state.gzipLevel)
    if (!cache.has(key)) cache.set(key, usePre ? fs.readFileSync(pre) : compress(raw, effective, state.gzipLevel))
    const body = cache.get(key)
    const headers = {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Content-Length': body.length, 'Cache-Control': 'public, max-age=600', Vary: 'Accept-Encoding',
    }
    if (effective !== 'identity') headers['Content-Encoding'] = effective
    res.writeHead(200, headers)
    res.end(body)
    log.push({ path: url.pathname, status: 200, mode: state.encoding, encoding: effective, compressor: effective === 'gzip' ? (usePre ? 'precompressed' : 'server-zlib') : null, accept_encoding: accepts, body_bytes: body.length, raw_bytes: raw.length })
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    port: server.address().port, log, state,
    closeAll: () => { server.closeAllConnections?.() },
    setEncoding(e, level) { state.encoding = e; if (level) state.gzipLevel = level },
    close: () => new Promise((r) => server.close(r)),
  })))
}
