// Engine assets inside a worker: each file named in the build's manifest is fetched once, from the instrument
// origin only, checked against its SHA-256 before use, and kept in the engine cache (Cache API, content-hashed)
// so the next load reads it from there. Progress counts compressed wire bytes, as OD-6's figure does (section 5.9).
//
// ARCHITECTURE.md section 15.4 puts the hash check in a service worker that serves verified copies to every
// request; until that lands (W1-T35 follow-up), this module does it for the requests that go through fetch().

import type { Asset, EngineManifestEntry } from '../../engines/contract.ts'

export const ENGINE_CACHE = 'ss-engines-v1'

const realFetch = self.fetch.bind(self)

const hex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

const TYPES: Readonly<Record<string, string>> = {
  wasm: 'application/wasm',
  mjs: 'text/javascript',
  js: 'text/javascript',
  json: 'application/json',
  zip: 'application/zip',
  whl: 'application/zip',
}
const typeOf = (p: string): string => TYPES[p.slice(p.lastIndexOf('.') + 1)] ?? 'application/octet-stream'

export interface AssetLoader {
  /** Absolute URL of an asset by its manifest path. */
  url(path: string): string
  /** Fetch, verify and cache every asset; resolves when all are held. */
  loadAll(): Promise<void>
  /** Route the worker's fetch() through the verified copies; any URL outside the manifest is refused. */
  installFetch(): void
}

export function assetLoader(base: string, entry: EngineManifestEntry, onProgress: (loaded: number, total: number) => void): AssetLoader {
  const byUrl = new Map<string, Asset>()
  for (const a of entry.assets) byUrl.set(new URL(a.path, base).href, a)
  const held = new Map<string, Promise<ArrayBuffer>>()
  const got = new Map<string, number>()
  let last = Number.NEGATIVE_INFINITY
  const report = (force = false): void => {
    const now = performance.now()
    if (!force && now - last < 250) return // a few per second (section 5.4)
    last = now
    let loaded = 0
    for (const a of entry.assets) loaded += Math.round(Math.min(1, (got.get(a.path) ?? 0) / a.bytes) * a.wire)
    onProgress(loaded, entry.firstLoadBytes)
  }

  async function fetchVerified(url: string, a: Asset): Promise<ArrayBuffer> {
    let cache: Cache | null = null
    try {
      cache = await caches.open(ENGINE_CACHE)
      const hit = await cache.match(url)
      if (hit !== undefined && hit.headers.get('x-ss-sha256') === a.sha256) {
        const buf = await hit.arrayBuffer()
        got.set(a.path, a.bytes)
        report()
        return buf
      }
    } catch {
      cache = null // no Cache API here (a private window): fetch every load
    }
    const res = await realFetch(url, { credentials: 'omit' })
    if (!res.ok || res.body === null) throw new Error(`engine asset ${a.path}: HTTP ${res.status}`)
    const reader = res.body.getReader()
    const parts: Uint8Array[] = []
    let n = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      parts.push(value)
      n += value.byteLength
      got.set(a.path, n)
      report()
    }
    const buf = new Uint8Array(n)
    let off = 0
    for (const p of parts) {
      buf.set(p, off)
      off += p.byteLength
    }
    const sum = hex(await crypto.subtle.digest('SHA-256', buf))
    if (sum !== a.sha256) throw new Error(`engine asset ${a.path}: SHA-256 ${sum} does not match the manifest`)
    if (cache !== null) {
      try {
        await cache.put(url, new Response(buf, { headers: { 'content-type': typeOf(a.path), 'x-ss-sha256': a.sha256 } }))
      } catch {
        // quota or a closed cache: the run goes on from memory
      }
    }
    return buf.buffer
  }

  const hold = (url: string, a: Asset): Promise<ArrayBuffer> => {
    let p = held.get(url)
    if (p === undefined) {
      p = fetchVerified(url, a)
      held.set(url, p)
    }
    return p
  }

  return {
    url: (path) => new URL(path, base).href,
    async loadAll() {
      report(true) // the loader shows the size from the first moment
      await Promise.all([...byUrl].map(([url, a]) => hold(url, a)))
      report(true)
    },
    installFetch() {
      const verified = async (input: RequestInfo | URL): Promise<Response> => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, self.location.href).href
        const a = byUrl.get(url)
        if (a === undefined) throw new TypeError(`the instrument origin loads only manifest assets; refused ${url}`)
        const buf = await hold(url, a)
        return new Response(buf.slice(0), { status: 200, headers: { 'content-type': typeOf(a.path) } })
      }
      self.fetch = verified as typeof self.fetch
    },
  }
}
