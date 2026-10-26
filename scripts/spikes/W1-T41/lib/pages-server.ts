// A static host that behaves like GitHub Pages, for the gate's two origins (and a third that stands in for a foreign site).
//
// Why not `vite preview`: it answers every unknown path with index.html and status 200, which would hide a route that has
// no static page of its own, and Pages does not do that. This host serves files; a directory without its trailing slash is
// redirected (301) and a directory with one serves its index.html; `/x` also serves `x.html`, as Pages does; anything else
// is 404, with the site's own 404.html when it has one. Text-like files are gzip level 5 when the client accepts it (the
// bytes W0-S08 found Pages sending), responses carry `Cache-Control: max-age=600` and an ETag, and there are no COOP or
// COEP headers and no CSP headers (policy rides in meta tags, ARCHITECTURE.md section 15.4).
//
// Test controls, which no production host has: a link shaper for chosen paths (the loader and Boot gates need an engine
// download that stays in flight), per-path overrides (the kill-switch test serves a changed sw.js), and a rewrite of origin
// strings in text responses (a build made for the placeholder domain, https://instruments.<domain>, runs against local ports).

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { extname, join, normalize, sep } from 'node:path'
import { gzipSync } from 'node:zlib'

export interface LoggedRequest {
  /** Which server answered: `site`, `instruments` or `foreign`. */
  label: string
  method: string
  path: string
  status: number
  /** Body bytes written to the socket (after any compression). */
  bytes: number
  encoding: string | null
  /** Milliseconds since the server started. */
  at: number
}

export interface Shape {
  mbps: number
  /** Extra delay before the first byte, in milliseconds. */
  rttMs?: number
  match: RegExp
}

export type Rewrites = () => ReadonlyArray<readonly [from: string, to: string]>

export interface ServerOptions {
  label: string
  dir: string
  log: LoggedRequest[]
  rewrites?: Rewrites
}

export interface PagesServer {
  label: string
  origin: string
  port: number
  setShape(shape: Shape | null): void
  /** Serve this body at this path instead of the file; null removes the override. */
  override(path: string, body: string | Buffer | null, contentType?: string): void
  /**
   * Compress, once, every file this host would compress for a request, so that a timed fetch of a 9 MB engine file does not pay
   * for gzip on its first request: a real host serves a stored copy, and the Boot gate measures the browser, not this server.
   */
  prime(): Promise<void>
  close(): Promise<void>
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.zip': 'application/zip',
  '.whl': 'application/octet-stream',
  '.webmanifest': 'application/manifest+json',
}

const TEXTUAL = /^(?:text\/|application\/(?:json|javascript|xml|manifest\+json)|image\/svg)/

const NOT_FOUND = '<!doctype html><meta charset="utf-8"><title>File not found</title><h1>404</h1><p>File not found</p>\n'

type Resolved = { file: string } | { redirect: string } | null

function resolvePath(dir: string, urlPath: string): Resolved {
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const abs = normalize(join(dir, decoded))
  if (abs !== dir && !abs.startsWith(dir + sep)) return null
  if (existsSync(abs)) {
    const st = statSync(abs)
    if (st.isFile()) return { file: abs }
    if (st.isDirectory()) {
      if (!decoded.endsWith('/')) return { redirect: `${urlPath}/` }
      const index = join(abs, 'index.html')
      return existsSync(index) ? { file: index } : null
    }
  }
  if (!decoded.endsWith('/') && extname(decoded) === '' && existsSync(`${abs}.html`)) return { file: `${abs}.html` }
  return null
}

const etagOf = (body: Buffer): string => `"${createHash('sha1').update(body).digest('hex').slice(0, 20)}"`

export async function startPagesServer(opts: ServerOptions): Promise<PagesServer> {
  const started = Date.now()
  let shape: Shape | null = null
  const overrides = new Map<string, { body: Buffer; type: string }>()
  const gzipMemo = new Map<string, Buffer>()

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://local')
    const method = req.method ?? 'GET'
    const entry: LoggedRequest = { label: opts.label, method, path: url.pathname + url.search, status: 0, bytes: 0, encoding: null, at: Date.now() - started }
    opts.log.push(entry)

    const send = (status: number, headers: Record<string, string | number>, body: Buffer | null): void => {
      entry.status = status
      res.writeHead(status, headers)
      const payload = method === 'HEAD' ? null : body
      if (!payload || payload.length === 0) {
        res.end()
        return
      }
      const s = shape && shape.match.test(url.pathname) ? shape : null
      if (!s) {
        entry.bytes = payload.length
        res.end(payload)
        return
      }
      // a link of a chosen rate: a delay for the round trip, then a slice every 10 ms
      const perTick = Math.max(512, Math.floor((s.mbps * 1e6) / 8 / 100))
      let offset = 0
      let closed = false
      res.on('close', () => {
        closed = true
      })
      const tick = (): void => {
        if (closed) return
        if (offset >= payload.length) {
          res.end()
          return
        }
        const slice = payload.subarray(offset, Math.min(payload.length, offset + perTick))
        offset += slice.length
        entry.bytes += slice.length
        res.write(slice, () => setTimeout(tick, 10))
      }
      setTimeout(tick, s.rttMs ?? 0)
    }

    const notFound = (): void => {
      const custom = join(opts.dir, '404.html')
      const body = existsSync(custom) ? readFileSync(custom) : Buffer.from(NOT_FOUND)
      send(404, { 'content-type': 'text/html; charset=utf-8', 'content-length': body.length }, body)
    }

    if (method !== 'GET' && method !== 'HEAD') {
      send(405, { allow: 'GET, HEAD', 'content-length': 0 }, null)
      return
    }

    let body: Buffer
    let type: string
    const override = overrides.get(url.pathname)
    if (override) {
      body = override.body
      type = override.type
    } else {
      const found = resolvePath(opts.dir, url.pathname)
      if (!found) return notFound()
      if ('redirect' in found) return send(301, { location: found.redirect + url.search, 'content-length': 0 }, null)
      body = readFileSync(found.file)
      type = TYPES[extname(found.file).toLowerCase()] ?? 'application/octet-stream'
    }

    if (TEXTUAL.test(type) && opts.rewrites) {
      const pairs = opts.rewrites()
      if (pairs.length > 0) {
        let text = body.toString('utf8')
        const before = text
        for (const [from, to] of pairs) text = text.split(from).join(to)
        if (text !== before) body = Buffer.from(text, 'utf8')
      }
    }

    const headers: Record<string, string | number> = {
      'content-type': type,
      'cache-control': 'max-age=600',
      'access-control-allow-origin': '*',
      vary: 'Accept-Encoding',
    }
    const gzipOk = /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? '')) && (TEXTUAL.test(type) || type === 'application/wasm' || type === 'font/ttf') && body.length >= 150
    if (gzipOk) {
      const key = `${opts.label}:${url.pathname}:${etagOf(body)}`
      let zipped = gzipMemo.get(key)
      if (!zipped) {
        zipped = gzipSync(body, { level: 5 })
        gzipMemo.set(key, zipped)
      }
      body = zipped
      headers['content-encoding'] = 'gzip'
      entry.encoding = 'gzip'
    }
    const etag = etagOf(body)
    headers['etag'] = etag
    if (req.headers['if-none-match'] === etag) return send(304, headers, null)
    headers['content-length'] = body.length
    send(200, headers, body)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const port = (server.address() as AddressInfo).port

  return {
    label: opts.label,
    origin: `http://127.0.0.1:${port}`,
    port,
    setShape: (s) => {
      shape = s
    },
    override: (path, body, contentType) => {
      if (body === null) overrides.delete(path)
      else overrides.set(path, { body: Buffer.isBuffer(body) ? body : Buffer.from(body), type: contentType ?? TYPES[extname(path).toLowerCase()] ?? 'text/html; charset=utf-8' })
    },
    prime: async () => {
      const big: string[] = []
      const visit = (dir: string, rel: string): void => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const r = `${rel}/${e.name}`
          if (e.isDirectory()) visit(join(dir, e.name), r)
          else if (statSync(join(dir, e.name)).size >= 64 * 1024 && (TEXTUAL.test(TYPES[extname(e.name).toLowerCase()] ?? '') || /\.(wasm|ttf)$/i.test(e.name))) big.push(r)
        }
      }
      visit(opts.dir, '')
      for (const path of big) {
        const res = await fetch(`http://127.0.0.1:${port}${path.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'accept-encoding': 'gzip' } })
        await res.arrayBuffer()
      }
      opts.log.length = 0 // the priming requests are not the gate's
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
