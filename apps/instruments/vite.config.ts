import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * The instrument origin's Content-Security-Policy (ARCHITECTURE.md section 15.4). The host page runs the
 * engine workers, so it alone may compile WebAssembly; it frames nothing and connects only to itself.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

/** Build only: the dev server injects inline scripts that this policy would block. */
function metaCsp(): Plugin {
  const anchor = /<meta charset="UTF-8"\s*\/?>/i
  return {
    name: 'statespace-meta-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!anchor.test(html)) throw new Error('meta-csp: a page lost its <meta charset>; the policy goes right after it')
        return html.replace(anchor, (m) => `${m}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
      },
    },
  }
}

/** The main origin a production build accepts when MAIN_ORIGIN is not given: the course's own site. */
export const PRODUCTION_MAIN_ORIGIN = 'https://statespace.play.naigap.com'

/**
 * The parents this build accepts (ARCHITECTURE.md section 5.5): an exact scheme, host and port, no wildcard and no
 * path. MAIN_ORIGIN, when set, is the whole list. Otherwise DEV_PARENTS, when set, is the list (a local
 * cross-origin test build; GATE-bundle's lint.parents fails such a build, so it never ships). Otherwise a
 * production build (`vite build`) holds the course's main origin alone, and the dev server accepts the local site
 * ports.
 */
export function allowedParents(mode: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const list = env.MAIN_ORIGIN
    ? [env.MAIN_ORIGIN]
    : env.DEV_PARENTS
      ? env.DEV_PARENTS.split(',')
      : mode === 'production'
        ? [PRODUCTION_MAIN_ORIGIN]
        : ['http://localhost:5181', 'http://localhost:3000', 'http://localhost:4173']
  for (const o of list) {
    if (new URL(o).origin !== o) throw new Error(`allowed parent ${o} is not an exact origin`)
  }
  return list
}

/** The build id the main origin names in its handshake; the deploy workflow sets INSTRUMENTS_BUILD to a content hash. */
const BUILD = process.env.INSTRUMENTS_BUILD ?? 'dev'

export default defineConfig(({ mode }) => ({
  // The instrument origin is its own static site; the deploy workflow sets VITE_BASE when it is not at the root.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), metaCsp()],
  define: {
    __INSTRUMENTS_BUILD__: JSON.stringify(BUILD),
    __ALLOWED_PARENTS__: JSON.stringify(allowedParents(mode)),
  },
  worker: { format: 'es' },
  build: {
    manifest: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        host: fileURLToPath(new URL('./host.html', import.meta.url)),
        instrument: fileURLToPath(new URL('./instrument.html', import.meta.url)),
      },
    },
  },
  server: { port: 5182 },
  preview: { port: 4174 },
}))
