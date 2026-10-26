// The main origin's service worker, from the page's side (ARCHITECTURE.md section 16). Production builds register
// `sw.js` at the site's base; the dev server never does, so a stale worker can never shadow Vite's modules. The page
// greets the worker with the ledger's data version (the schema handshake), and `?nosw=1` is the recovery link: it tells
// the live worker to stop and retire, unregisters every registration and clears the caches, so the next load comes
// from the network alone.

import { LEDGER_DATA_VERSION } from '../storage/db.ts'

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`

/** Cache names the worker owns (the vendored worker's prefix, rewritten for statespace by src/sw/build-sw.mjs). */
export const CACHE_PREFIX = 'ss-'

const supported = (): boolean => typeof navigator !== 'undefined' && 'serviceWorker' in navigator

/** Unregister every registration of this origin and delete the worker's caches. Does nothing when none exists. */
export async function retireServiceWorker(): Promise<void> {
  if (!supported()) return
  try {
    navigator.serviceWorker.controller?.postMessage({ t: 'kill' })
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {
    // a profile that refuses: nothing registered to retire
  }
  // A request the old worker answered just before it read `kill` can still write a cache after the first sweep, so
  // sweep again once it has had time to stop.
  for (const wait of [0, 300, 1200]) {
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    try {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k)))
    } catch {
      return // no Cache API: nothing cached
    }
  }
}

function greet(worker: ServiceWorker | null | undefined): void {
  worker?.postMessage({ t: 'hello', schemaVersion: LEDGER_DATA_VERSION })
}

export async function registerServiceWorker(): Promise<void> {
  if (!supported()) return
  if (new URLSearchParams(location.search).get('nosw') === '1') {
    await retireServiceWorker()
    return
  }
  if (!import.meta.env.PROD) return
  try {
    const reg = await navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE })
    greet(navigator.serviceWorker.controller)
    greet(reg.active)
    navigator.serviceWorker.addEventListener('controllerchange', () => greet(navigator.serviceWorker.controller))
  } catch {
    // registration refused (a private window, a blocked profile): the site works from the network
  }
}

export type OfflineState =
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'dev' }
  | { readonly kind: 'off' }
  | { readonly kind: 'installing' }
  | { readonly kind: 'on'; readonly caches: number; readonly files: number }

/** What SCR-settings reports about the offline copy. */
export async function offlineState(): Promise<OfflineState> {
  if (!supported()) return { kind: 'unsupported' }
  if (!import.meta.env.PROD) return { kind: 'dev' }
  const reg = await navigator.serviceWorker.getRegistration(BASE).catch(() => undefined)
  if (reg === undefined) return { kind: 'off' }
  if (reg.active === null) return { kind: 'installing' }
  let names: string[] = []
  let files = 0
  try {
    names = (await caches.keys()).filter((k) => k.startsWith(CACHE_PREFIX) && !k.endsWith('meta'))
    for (const n of names) files += (await (await caches.open(n)).keys()).length
  } catch {
    // no Cache API in this context
  }
  return { kind: 'on', caches: names.length, files }
}

/** Run once per page: register the worker or honour ?nosw=1. */
let started = false
export function installServiceWorker(): void {
  if (started || typeof window === 'undefined') return
  started = true
  if (document.readyState === 'complete') void registerServiceWorker()
  else window.addEventListener('load', () => void registerServiceWorker(), { once: true })
}
