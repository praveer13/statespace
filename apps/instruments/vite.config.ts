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

export default defineConfig({
  // The instrument origin is its own static site; the deploy workflow sets VITE_BASE when it is not at the root.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), metaCsp()],
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
  server: { port: 3001 },
  preview: { port: 4174 },
})
