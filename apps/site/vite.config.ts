import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * The main origin's Content-Security-Policy (ARCHITECTURE.md section 15.4). GitHub Pages sends no response
 * headers, so the policy rides in a meta tag. The instrument origin's host name is deployment configuration:
 * committed files write <course-domain> (OD-5), and the build reads COURSE_DOMAIN. With none set the frame
 * source is 'none', so a build made without it embeds nothing.
 */
export function contentSecurityPolicy(courseDomain: string | undefined, instrumentsOrigin: string | undefined = process.env.VITE_INSTRUMENTS_ORIGIN): string {
  // VITE_INSTRUMENTS_ORIGIN (apps/site/src/instruments/config.ts) names the instrument origin exactly and wins.
  const frame = instrumentsOrigin ? instrumentsOrigin : courseDomain ? `https://instruments.${courseDomain}` : "'none'"
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    `frame-src ${frame}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
}

/** Build only: the dev server injects inline scripts that this policy would block. */
function metaCsp(policy: string): Plugin {
  const anchor = /<meta charset="UTF-8"\s*\/?>/i
  return {
    name: 'statespace-meta-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!anchor.test(html)) throw new Error('meta-csp: index.html lost its <meta charset>; the policy goes right after it')
        // first in <head> after the charset, so it governs every script and stylesheet that follows
        return html.replace(anchor, (m) => `${m}\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

export default defineConfig({
  // GitHub Pages serves a project site under /<repo>/; the deploy workflow sets VITE_BASE for it.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), metaCsp(contentSecurityPolicy(process.env.COURSE_DOMAIN))],
  build: {
    // GATE-bundle walks dist/.vite/manifest.json to measure each route's static JS and CSS closure.
    manifest: true,
    target: 'es2022',
  },
  server: { port: 3000 },
})
