// The bus host (ARCHITECTURE.md section 5): the page the main origin embeds in a hidden, sandboxed iframe.
// It says hello to each allowed parent by name, adopts exactly one MessagePort from an origin-checked `connect`,
// and from then on reads only that port. Every message is checked for shape, size and structure before use;
// the supervisor runs the engines. The host never fetches a URL taken from a message (section 5.5).

import { BUS, LIMITS, byteLength, clip, isId, structuralProblem, type EngineCaps, type FromHost, type ToHost } from '../bus/protocol.ts'
import type { EngineManifest } from '../engines/contract.ts'
import { ENGINES } from '../engines/registry.ts'
import { ENGINE_CACHE } from '../workers/shared/assets.ts'
import { Supervisor } from './supervisor.ts'

const BUILD: string = __INSTRUMENTS_BUILD__
const ALLOWED_PARENTS: readonly string[] = __ALLOWED_PARENTS__
const BASE = new URL(import.meta.env.BASE_URL, location.href).href

const status = document.getElementById('status')
const say = (s: string): void => {
  if (status) status.textContent = s
}

let port: MessagePort | null = null
let manifestP: Promise<EngineManifest> | null = null

const manifest = (): Promise<EngineManifest> => {
  if (manifestP === null) {
    manifestP = fetch(new URL('engines/manifest.json', BASE), { credentials: 'omit' })
      .then((r) => {
        if (!r.ok) throw new Error(`engine manifest: HTTP ${r.status}`)
        return r.json() as Promise<EngineManifest>
      })
      .catch((e: unknown) => {
        manifestP = null
        throw e
      })
  }
  return manifestP
}

function send(m: FromHost): void {
  if (port === null) return
  if (byteLength(m) > LIMITS.messageBytes) {
    const id = 'id' in m ? m.id : undefined
    port.postMessage({ t: 'error', ...(id !== undefined ? { id } : {}), code: 'too-large', detail: `a reply above ${LIMITS.messageBytes} bytes was dropped` } satisfies FromHost)
    return
  }
  port.postMessage(m)
}

const supervisor = new Supervisor({ send, manifest, build: BUILD, base: BASE })

async function caps(): Promise<EngineCaps[]> {
  let m: EngineManifest | null = null
  try {
    m = await manifest()
  } catch {
    m = null
  }
  let cache: Cache | null = null
  try {
    cache = await caches.open(ENGINE_CACHE)
  } catch {
    cache = null
  }
  const out: EngineCaps[] = []
  for (const def of Object.values(ENGINES)) {
    const e = m?.engines[def.engine]
    if (e === undefined) continue
    let cached = cache !== null
    if (cache !== null) {
      for (const a of e.assets) {
        const hit = await cache.match(new URL(a.path, BASE).href)
        if (hit === undefined || hit.headers.get('x-ss-sha256') !== a.sha256) {
          cached = false
          break
        }
      }
    }
    out.push({ engine: def.engine, version: def.version, label: e.label, firstLoadBytes: e.firstLoadBytes, rawBytes: e.rawBytes, cached })
  }
  return out
}

async function evict(id: string): Promise<void> {
  supervisor.stopAll()
  let deleted = false
  try {
    deleted = await caches.delete(ENGINE_CACHE)
  } catch {
    deleted = false
  }
  send({ t: 'result', id, reply: { evicted: deleted } })
}

function onPort(e: MessageEvent): void {
  const m = e.data as ToHost | null
  const id = m !== null && typeof m === 'object' && 'id' in m && isId(m.id) ? m.id : undefined
  const bad = (code: 'bad-message' | 'too-large', detail: string): void => send({ t: 'error', ...(id !== undefined ? { id } : {}), code, detail })
  if (m === null || typeof m !== 'object' || typeof m.t !== 'string') return bad('bad-message', 'not a bus message')
  if (byteLength(m) > LIMITS.messageBytes) return bad('too-large', `a message above ${LIMITS.messageBytes} bytes`)
  const shape = structuralProblem(m)
  if (shape !== null) return bad('bad-message', shape)
  if (id === undefined) return bad('bad-message', 'a request needs a 128-bit hex id')
  switch (m.t) {
    case 'run':
      if (m.req === null || typeof m.req !== 'object') return bad('bad-message', 'run needs req')
      return supervisor.run(id, m.req)
    case 'cancel':
      return supervisor.cancel(id)
    case 'warm':
      return supervisor.warm(id, String(m.engine))
    case 'caps':
      void caps().then((c) => send({ t: 'result', id, reply: { engines: c } }))
      return
    case 'evict':
      void evict(id)
      return
    default:
      return bad('bad-message', `unknown t: ${clip(String((m as { t: string }).t), 40)}`)
  }
}

function onWindow(e: MessageEvent): void {
  if (port !== null) return // after the handshake, window messages are ignored unread
  if (!ALLOWED_PARENTS.includes(e.origin) || e.source !== window.parent) return
  const d = e.data as { t?: unknown; bus?: unknown; build?: unknown; nonce?: unknown } | null
  if (d === null || typeof d !== 'object' || d.t !== 'connect' || d.bus !== BUS || d.build !== BUILD || typeof d.nonce !== 'string') return
  if (e.ports.length !== 1) return
  port = e.ports[0] as MessagePort
  window.removeEventListener('message', onWindow)
  port.onmessage = onPort
  say('Connected to the course.')
  void caps().then((engines) => send({ t: 'ready', engines }))
}

function start(): void {
  if (window.parent === window) {
    say('This page belongs to the statespace course and does nothing on its own.')
    return
  }
  const anc = 'ancestorOrigins' in location ? Array.from(location.ancestorOrigins) : []
  const first = anc[0]
  if (first !== undefined && first !== 'null' && !ALLOWED_PARENTS.includes(first)) {
    say('Refused: embedded by a page outside the course.')
    return
  }
  window.addEventListener('message', onWindow)
  // One hello per allowed parent, each naming that origin, so only the real parent receives one.
  for (const o of ALLOWED_PARENTS) window.parent.postMessage({ t: 'hello', bus: BUS, build: BUILD } satisfies FromHost, o)
  say('Waiting for the course.')
}

start()
